import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handlePaidBilling } from "@/lib/billing-fulfillment";
import { apiError, corsOptions, resolvePublicUser, withPublicCors } from "@/lib/public-api";
import { notifyPaymentPending } from "@/lib/telegram";
import { getTransactionStatus, mapTransactionStatus, initMidtrans } from "@/lib/midtrans";

/**
 * Confirm a pending topup after client-side payment success.
 * Idempotent: if already paid, just returns current balance.
 * Also used when returning from Xendit (orderId query param).
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await resolvePublicUser(request);
    if (!identity) return apiError("Unauthorized", 401, "invalid_api_key");
    const userId = identity.user.id;

    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : null;

    if (!orderId) {
      return apiError("orderId required", 400, "invalid_request");
    }

    const billing = await prisma.billingRecord.findFirst({
      where: { midtransOrderId: orderId, userId },
    });

    if (!billing) {
      return apiError("Billing record not found", 404, "billing_not_found");
    }

    // Already paid — return balance (idempotent)
    if (billing.status === "paid") {
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      return withPublicCors(NextResponse.json({
        status: "paid",
        balance: wallet ? Number(wallet.balance) : 0,
      }));
    }

    // QRIS merchant (static) has no PSP callback/status API — payment can only
    // be confirmed manually by an admin. Flag it for review, never auto-fulfill.
    if (billing.provider === "qris") {
      const note = typeof body.proofNote === "string" ? body.proofNote.slice(0, 500) : null;
      const proofImage = typeof body.proofImage === "string" ? body.proofImage.slice(0, 500) : null;
      const pending = await prisma.billingRecord.update({
        where: { id: billing.id },
        data: {
          status: "pending_confirmation",
          ...(note ? { proofNote: note } : {}),
          ...(proofImage ? { proofImage } : {}),
        },
      });
      const wallet = await prisma.wallet.findUnique({ where: { userId } });

      // Fire-and-forget: notify admins via Telegram bot (never block the user flow)
      await notifyPaymentPending(pending).catch(() => {});

      return withPublicCors(NextResponse.json({
        status: pending.status,
        balance: wallet ? Number(wallet.balance) : 0,
      }));
    }

    // Optional: verify with Midtrans if still pending
    let shouldFulfill = false;
    try {
      await initMidtrans();
      const status = await getTransactionStatus(orderId);
      const mapped = mapTransactionStatus(status.transaction_status, status.fraud_status);
      if (mapped === "completed") shouldFulfill = true;
    } catch {
      // Midtrans check failed (or Xendit) — trust client signal only if type is topup
      // For Xendit we rely on webhook; for Midtrans onSuccess we fulfill here as safety net
      shouldFulfill = billing.type === "topup";
    }

    if (!shouldFulfill) {
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      return withPublicCors(NextResponse.json({
        status: billing.status,
        balance: wallet ? Number(wallet.balance) : 0,
      }));
    }

    const updated = await prisma.billingRecord.update({
      where: { id: billing.id },
      data: { status: "paid", paidAt: new Date() },
    });

    // Only fulfill if we just flipped to paid (idempotent vs webhook race)
    if (billing.status !== "paid") {
      await handlePaidBilling(updated);
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    return withPublicCors(NextResponse.json({
      status: "paid",
      balance: wallet ? Number(wallet.balance) : 0,
    }));
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500, "internal_error", "server_error");
  }
}

export function OPTIONS() {
  return corsOptions();
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handlePaidBilling } from "@/lib/billing-fulfillment";
import { getTransactionStatus, mapTransactionStatus, initMidtrans } from "@/lib/midtrans";

async function resolveUserId(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token, isActive: true },
      select: { userId: true },
    });
    if (apiKey) return apiKey.userId;
  }
  const session = await getSession();
  return session?.sub ?? null;
}

/**
 * Confirm a pending topup after client-side payment success.
 * Idempotent: if already paid, just returns current balance.
 * Also used when returning from Xendit (orderId query param).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : null;

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const billing = await prisma.billingRecord.findFirst({
      where: { midtransOrderId: orderId, userId },
    });

    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 });
    }

    // Already paid — return balance (idempotent)
    if (billing.status === "paid") {
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      return NextResponse.json({
        status: "paid",
        balance: wallet ? Number(wallet.balance) : 0,
      });
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
      return NextResponse.json({
        status: billing.status,
        balance: wallet ? Number(wallet.balance) : 0,
      });
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
    return NextResponse.json({
      status: "paid",
      balance: wallet ? Number(wallet.balance) : 0,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

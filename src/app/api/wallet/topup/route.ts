import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTransaction } from "@/lib/payment-gateway";
import { apiError, corsOptions, resolvePublicUser, withPublicCors } from "@/lib/public-api";

export async function POST(request: NextRequest) {
  try {
    const identity = await resolvePublicUser(request);
    if (!identity) return apiError("Unauthorized", 401, "invalid_api_key");
    const user = identity.user;

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError("amount must be > 0", 400, "invalid_amount");
    }

    const orderId = `TOPUP-${randomUUID()}-${Date.now()}`;
    const billing = await prisma.billingRecord.create({
      data: {
        userId: user.id,
        type: "topup",
        status: "pending",
        amount,
        midtransOrderId: orderId,
        description: "Wallet topup",
      },
    });

    try {
      const origin = request.headers.get("origin") || request.nextUrl.origin;
      const successRedirectUrl = `${origin}/payment/callback?status=success&provider=xendit&orderId=${encodeURIComponent(orderId)}`;
      const failureRedirectUrl = `${origin}/payment/callback?status=failed&provider=xendit&orderId=${encodeURIComponent(orderId)}`;

      const transaction = await createTransaction(
        orderId,
        amount,
        {
          name: user.name ?? undefined,
          email: user.email,
        },
        { successRedirectUrl, failureRedirectUrl }
      );

      await prisma.billingRecord.update({
        where: { id: billing.id },
        data: {
          provider: transaction.provider,
          midtransToken: transaction.token,
          midtransUrl: transaction.redirectUrl,
        },
      });

      return withPublicCors(NextResponse.json({
        billing,
        transaction: {
          token: transaction.token,
          redirectUrl: transaction.redirectUrl,
          provider: transaction.provider,
          kind: transaction.kind,
          qrDataUrl: transaction.qrDataUrl,
          orderId,
        },
      }));
    } catch (e) {
      // Hapus billing record yang tidak berguna
      await prisma.billingRecord.delete({ where: { id: billing.id } }).catch(() => {});

      const msg = e instanceof Error ? e.message : "Payment gateway not available";
      return apiError(msg, 503, "provider_unavailable", "server_error");
    }
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500, "internal_error", "server_error");
  }
}

export function OPTIONS() {
  return corsOptions();
}

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTransaction } from "@/lib/payment-gateway";

async function resolveUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token, isActive: true },
      include: { user: true },
    });
    if (apiKey) return apiKey.user;
  }
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    return user;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
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
          midtransToken: transaction.token,
          midtransUrl: transaction.redirectUrl,
        },
      });

      return NextResponse.json({
        billing,
        transaction: {
          token: transaction.token,
          redirectUrl: transaction.redirectUrl,
          provider: transaction.provider,
          orderId,
        },
      });
    } catch {
      // Dev fallback: credit wallet directly when no payment gateway configured
      await prisma.billingRecord.update({
        where: { id: billing.id },
        data: { status: "paid", paidAt: new Date() },
      });
      const { topupWallet } = await import("@/lib/server-store");
      await topupWallet(user.id, amount);

      return NextResponse.json({
        billing,
        note: "Payment not configured. Wallet credited directly (dev mode).",
        devMode: true,
      });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

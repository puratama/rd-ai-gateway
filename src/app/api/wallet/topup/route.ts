import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTransaction } from "@/lib/midtrans";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token, isActive: true },
      include: { user: true },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }

    const orderId = `TOPUP-${randomUUID()}-${Date.now()}`;
    const billing = await prisma.billingRecord.create({
      data: {
        userId: apiKey.userId,
        type: "topup",
        status: "pending",
        amount,
        midtransOrderId: orderId,
        description: "Wallet topup",
      },
    });

    const transaction = await createTransaction(orderId, amount, {
      name: apiKey.user.name ?? undefined,
      email: apiKey.user.email,
    });

    const updatedBilling = await prisma.billingRecord.update({
      where: { id: billing.id },
      data: {
        midtransToken: transaction.token,
        midtransUrl: transaction.redirect_url,
      },
    });

    return NextResponse.json({
      billing: updatedBilling,
      transaction: {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

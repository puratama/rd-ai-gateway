import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapTransactionStatus, verifySignature } from "@/lib/midtrans";
import type { MidtransNotification } from "@/lib/midtrans";

export async function POST(request: NextRequest) {
  try {
    const notification = (await request.json()) as MidtransNotification;

    if (!notification?.order_id || !notification?.transaction_status || !notification?.fraud_status) {
      return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
    }

    if (!verifySignature(notification)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const billing = await prisma.billingRecord.findUnique({
      where: { midtransOrderId: notification.order_id },
    });

    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 });
    }

    const normalizedStatus = normalizeBillingStatus(
      mapTransactionStatus(notification.transaction_status, notification.fraud_status)
    );

    const updatedBilling = await prisma.billingRecord.update({
      where: { id: billing.id },
      data: {
        status: normalizedStatus,
        paidAt: normalizedStatus === "paid" ? new Date() : billing.paidAt,
      },
    });

    if (normalizedStatus === "paid" && billing.status !== "paid") {
      await handlePaidBilling(updatedBilling);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function normalizeBillingStatus(
  status: "completed" | "pending" | "failed" | "refunded"
): "pending" | "paid" | "failed" | "expired" {
  switch (status) {
    case "completed":
      return "paid";
    case "refunded":
      return "failed";
    default:
      return status;
  }
}

function addBillingPeriod(date: Date, billingPeriod: string): Date {
  const result = new Date(date);
  switch (billingPeriod) {
    case "daily":
      result.setDate(result.getDate() + 1);
      break;
    case "weekly":
      result.setDate(result.getDate() + 7);
      break;
    case "yearly":
      result.setFullYear(result.getFullYear() + 1);
      break;
    default:
      result.setMonth(result.getMonth() + 1);
      break;
  }
  return result;
}

async function handlePaidBilling(
  billing: {
    id: string;
    userId: string;
    type: string;
    amount: unknown;
    planId: string | null;
    description: string | null;
  }
) {
  if (billing.type === "topup") {
    await prisma.wallet.upsert({
      where: { userId: billing.userId },
      update: { balance: { increment: billing.amount as unknown as number } },
      create: { userId: billing.userId, balance: billing.amount as unknown as number },
    });
    return;
  }

  if (!billing.planId) {
    return;
  }

  const plan = await prisma.plan.findUnique({ where: { id: billing.planId } });
  if (!plan) {
    return;
  }

  if (billing.type === "subscription") {
    await prisma.subscription.create({
      data: {
        userId: billing.userId,
        planId: plan.id,
        status: "active",
        endDate: addBillingPeriod(new Date(), plan.billingPeriod),
      },
    });
    return;
  }

  if (billing.type === "package_purchase") {
    await prisma.userPackage.create({
      data: {
        userId: billing.userId,
        planId: plan.id,
        status: "active",
        tokensTotal: plan.maxTokensPerPeriod,
        tokensRemaining: plan.maxTokensPerPeriod,
        expiresAt: addBillingPeriod(new Date(), plan.billingPeriod),
        billingId: billing.id,
      },
    });
  }
}

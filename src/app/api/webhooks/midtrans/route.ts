import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapTransactionStatus, verifySignature, initMidtrans } from "@/lib/midtrans";
import { handlePaidBilling } from "@/lib/billing-fulfillment";
import type { MidtransNotification } from "@/lib/midtrans";

export async function POST(request: NextRequest) {
  try {
    // Ensure Midtrans config loaded from DB before signature verification
    await initMidtrans();

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

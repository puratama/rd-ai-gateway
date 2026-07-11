import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { updateBillingStatus, getBillingRecord, extendSubscription } = await import("@/lib/server-store");
    const { verifySignature, mapTransactionStatus } = await import("@/lib/midtrans");

    const notification = body as import("@/lib/midtrans").MidtransNotification;
    const orderId = notification.order_id;

    // Verify signature
    if (!verifySignature(notification)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Get billing record
    const billingRecord = await getBillingRecord(orderId);
    if (!billingRecord) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Map transaction status
    const status = mapTransactionStatus(
      notification.transaction_status,
      notification.fraud_status
    );

    // Update billing record
    await updateBillingStatus(
      orderId,
      status,
    );

    // If payment completed, extend subscription
    if (status === "completed" && billingRecord.planId) {
      const { getPlan } = await import("@/lib/server-store");
      const plan = await getPlan(billingRecord.planId);
      await extendSubscription(
        billingRecord.userId,
        billingRecord.planId,
        plan?.billingPeriod as import("@/lib/server-store").BillingPeriod || "monthly"
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// Midtrans sends webhooks as GET too
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: "Use POST for webhook" }, { status: 405 });
}

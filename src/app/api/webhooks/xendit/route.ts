import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyXenditSignature, mapXenditStatus } from "@/lib/xendit";
import { handlePaidBilling } from "@/lib/billing-fulfillment";

export async function POST(request: NextRequest) {
  try {
    // Get x-callback-token header
    const callbackToken = request.headers.get("x-callback-token");
    if (!callbackToken) {
      return NextResponse.json({ error: "Missing x-callback-token header" }, { status: 400 });
    }

    // Verify signature
    const isValid = await verifyXenditSignature(callbackToken);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const notification = await request.json();

    // Xendit Invoice webhook payload uses `id` (invoice id) and `external_id` (our billing record id)
    const externalId = notification.external_id;
    const invoiceId = notification.id;
    const status = notification.status;

    if (!externalId) {
      return NextResponse.json({ error: "Missing external_id in payload" }, { status: 400 });
    }

    // Find billing record by id or midtransOrderId
    // Xendit's external_id is our BillingRecord.id
    let billing = await prisma.billingRecord.findUnique({
      where: { id: externalId },
    });

    // Fallback: if not found by id, try midtransOrderId (for legacy/transition)
    if (!billing) {
      billing = await prisma.billingRecord.findUnique({
        where: { midtransOrderId: externalId },
      });
    }

    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 });
    }

    const normalizedStatus = mapXenditStatus(status);

    // Idempotency: if already paid and this is also paid, don't double-fulfill
    const updatedBilling = await prisma.billingRecord.update({
      where: { id: billing.id },
      data: {
        status: normalizedStatus,
        paidAt: normalizedStatus === "paid" ? new Date() : billing.paidAt,
        // Store Xendit invoice id in midtransOrderId field (generic external order id)
        midtransOrderId: invoiceId,
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
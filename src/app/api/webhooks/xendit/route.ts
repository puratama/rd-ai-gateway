import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyXenditSignature, mapXenditStatus } from "@/lib/xendit";
import { handlePaidBilling } from "@/lib/billing-fulfillment";
import { markBillingPaidOnce } from "@/lib/db/billing";

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

    // Xendit Invoice webhook payload uses `id` (invoice id) and `external_id`
    // (our orderId, stored in BillingRecord.midtransOrderId)
    const externalId = notification.external_id;
    const status = notification.status;

    if (!externalId) {
      return NextResponse.json({ error: "Missing external_id in payload" }, { status: 400 });
    }

    // Primary lookup: external_id is the orderId we sent, stored in midtransOrderId
    let billing = await prisma.billingRecord.findUnique({
      where: { midtransOrderId: externalId },
    });

    // Fallback: if not found by orderId, try BillingRecord.id (legacy/transition)
    if (!billing) {
      billing = await prisma.billingRecord.findUnique({
        where: { id: externalId },
      });
    }

    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 });
    }

    const normalizedStatus = mapXenditStatus(status);

    if (normalizedStatus === "paid") {
      // Atomic paid transition — fulfills exactly once across webhook/confirm races.
      // NOTE: never overwrite midtransOrderId with Xendit's invoice id; it is our lookup key.
      const marked = await markBillingPaidOnce({ id: billing.id });
      if (marked) {
        await handlePaidBilling(billing);
      }
    } else if (normalizedStatus !== billing.status) {
      await prisma.billingRecord.update({
        where: { id: billing.id },
        data: { status: normalizedStatus },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
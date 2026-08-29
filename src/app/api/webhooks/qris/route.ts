import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handlePaidBilling } from "@/lib/billing-fulfillment";
import { markBillingPaidOnce } from "@/lib/db/billing";

// QRIS Merchant webhook (generic PSP callback — e.g. Xendit/Midtrans QRIS product).
// Caveat: a pure merchant static QRIS has NO bank/e-wallet webhook. This endpoint is
// only actionable when the QRIS is backed by a PSP that sends a callback.
// For static merchant QRIS, status comes from manual confirm (/api/wallet/topup/confirm).

function mapQrisStatus(status: string): "pending" | "paid" | "failed" | "expired" {
  switch (status.toUpperCase()) {
    case "PAID":
    case "SUCCESS":
    case "SETTLED":
      return "paid";
    case "EXPIRED":
    case "FAILED":
      return "failed";
    case "PENDING":
      return "pending";
    default:
      return "failed";
  }
}

async function verifyCallbackToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const gateway = await prisma.paymentGatewayConfig.findFirst({
    where: { provider: "qris" },
  });
  return Boolean(gateway?.clientKeyEnc && gateway.clientKeyEnc === token);
}

export async function POST(request: NextRequest) {
  try {
    const callbackToken = request.headers.get("x-callback-token");
    if (!(await verifyCallbackToken(callbackToken))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const notification = await request.json();
    const orderId = notification.external_id ?? notification.orderId;
    const status = notification.status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId in payload" }, { status: 400 });
    }

    const billing = await prisma.billingRecord.findUnique({
      where: { midtransOrderId: orderId },
    });
    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 });
    }

    const normalizedStatus = mapQrisStatus(status);

    if (normalizedStatus === "paid") {
      // Atomic paid transition — fulfills exactly once across webhook/confirm races
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
// Unified payment gateway — reads active config from DB and routes
// to the correct provider implementation (Midtrans snap / Xendit invoice).

import { getPaymentConfig } from "./payment-config";

export interface PaymentTransactionResult {
  token: string;
  redirectUrl: string;
  provider: "midtrans" | "xendit" | "qris";
  kind: "redirect" | "qris";
  /** Present when kind === "qris": a data-URL PNG the client must show for scanning. */
  qrDataUrl?: string;
  /** QRIS dynamic payload string (for copy). */
  maskedPayload?: string;
  /** Merchant display name parsed from tag 59. */
  merchantName?: string;
  /** QRIS expiry, defaults to 15 minutes after creation. */
  expiresAt?: string;
}

/**
 * Find the first active payment gateway from DB.
 * Returns null if none configured.
 */
async function getActiveGateway(): Promise<"midtrans" | "xendit" | "qris" | null> {
  const midtrans = await getPaymentConfig("midtrans");
  if (midtrans?.isActive) return "midtrans";

  const xendit = await getPaymentConfig("xendit");
  if (xendit?.isActive) return "xendit";

  const qris = await getPaymentConfig("qris");
  if (qris?.isActive) return "qris";

  return null;
}

/**
 * Create a payment transaction using the configured active gateway.
 *
 * @param orderId - Unique order ID (used as external_id for Xendit)
 * @param amount - Transaction amount in IDR
 * @param customerDetails - Optional customer info
 * @returns Unified transaction result
 */
export async function createTransaction(
  orderId: string,
  amount: number,
  customerDetails?: { name?: string; email?: string; phone?: string },
  options?: { successRedirectUrl?: string; failureRedirectUrl?: string }
): Promise<PaymentTransactionResult> {
  const provider = await getActiveGateway();

  if (!provider) {
    throw new Error(
      "No active payment gateway configured. Go to Admin > Settings > Payment Gateway to set up Midtrans or Xendit."
    );
  }

  if (provider === "midtrans") {
    const { createTransaction: createMidtrans } = await import("./midtrans");
    const result = await createMidtrans(orderId, amount, customerDetails);
    return {
      token: result.token,
      redirectUrl: result.redirect_url,
      provider: "midtrans",
      kind: "redirect",
    };
  }

  if (provider === "qris") {
    const { createQrisPayment } = await import("./qris");
    const result = await createQrisPayment(orderId, amount);
    return {
      token: orderId,
      redirectUrl: "",
      provider: "qris",
      kind: "qris",
      qrDataUrl: result.qrDataUrl,
      maskedPayload: result.maskedPayload,
      merchantName: result.merchantName,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  // provider === "xendit"
  const { createXenditInvoice } = await import("./xendit");
  const invoice = await createXenditInvoice(
    orderId,
    amount,
    customerDetails,
    options?.successRedirectUrl,
    options?.failureRedirectUrl
  );
  return {
    token: invoice.id,
    redirectUrl: invoice.invoice_url,
    provider: "xendit",
    kind: "redirect",
  };
}

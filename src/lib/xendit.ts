// Xendit Payment Gateway Helper
// Config loaded from PaymentGatewayConfig DB table.
// Configure via Admin > Settings > Payment Gateway

import { timingSafeEqual } from "crypto";
import { getPaymentConfig } from "./payment-config";

export interface XenditInvoiceNotification {
  id: string;
  external_id: string;
  user_id: string;
  is_high: boolean;
  payment_method?: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "SETTLED";
  merchant_name: string;
  amount: number;
  paid_amount?: number;
  updated: string;
  created: string;
  currency: string;
  payment_channel?: string;
  payment_destination?: string;
}

export interface XenditInvoice {
  id: string;
  invoice_url: string;
  external_id: string;
  status: string;
  amount: number;
}

let _cachedSecretKey: string | null = null;
let _cachedCallbackToken: string | null = null;
let _cachedIsProduction: boolean | null = null;

/**
 * Initialize Xendit config from DB.
 */
export async function initXendit(): Promise<void> {
  const config = await getPaymentConfig("xendit");
  _cachedSecretKey = config?.serverKey || null;
  _cachedCallbackToken = config?.clientKey || null;
  _cachedIsProduction = config?.environment === "production" || null;
  if (!_cachedSecretKey) {
    console.warn("[xendit] No active Xendit config in DB. Transactions will fail.");
  }
}

function getSecretKey(): string {
  if (!_cachedSecretKey) throw new Error("XENDIT_SECRET_KEY not configured — set via Admin > Settings > Payment Gateway");
  return _cachedSecretKey;
}

// Create Xendit Invoice
export async function createXenditInvoice(
  externalId: string,
  amount: number,
  customerDetails?: { name?: string; email?: string; phone?: string },
  successRedirectUrl?: string,
  failureRedirectUrl?: string
): Promise<XenditInvoice> {
  await initXendit();
  const secretKey = getSecretKey();
  const auth = Buffer.from(secretKey + ":").toString("base64");

  const body: Record<string, unknown> = {
    external_id: externalId,
    amount,
    description: "Wallet topup",
  };

  if (successRedirectUrl) body.success_redirect_url = successRedirectUrl;
  if (failureRedirectUrl || successRedirectUrl) {
    body.failure_redirect_url = failureRedirectUrl || successRedirectUrl;
  }

  if (customerDetails) {
    if (customerDetails.email) body.payer_email = customerDetails.email;
  }

  const response = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Xendit API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as XenditInvoice;
  return {
    id: data.id,
    invoice_url: data.invoice_url,
    external_id: data.external_id,
    status: data.status,
    amount: data.amount,
  };
}

// Verify Xendit token from header against DB callback token
export async function verifyXenditSignature(tokenFromHeader: string | null): Promise<boolean> {
  if (!tokenFromHeader) return false;
  if (_cachedCallbackToken === null) {
    await initXendit();
  }
  if (!_cachedCallbackToken) return false;
  const a = Buffer.from(tokenFromHeader, "utf8");
  const b = Buffer.from(_cachedCallbackToken, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Map Xendit Invoice status to our billing status
export function mapXenditStatus(status: string): "pending" | "paid" | "failed" | "expired" {
  switch (status) {
    case "PAID":
    case "SETTLED":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "PENDING":
      return "pending";
    default:
      return "failed";
  }
}

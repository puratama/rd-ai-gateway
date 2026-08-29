// Midtrans Payment Gateway Helper
// Docs: https://docs.midtrans.com/
// All config (server key, environment) loaded from PaymentGatewayConfig DB table.
// Configure via Admin > Settings > Payment Gateway

import { createHash, timingSafeEqual } from "crypto";
import { getPaymentConfig } from "./payment-config";

let _cachedServerKey: string | null = null;
let _cachedIsProduction: boolean | null = null;

async function loadConfig(): Promise<void> {
  const config = await getPaymentConfig("midtrans");
  _cachedServerKey = config?.serverKey || null;
  _cachedIsProduction = config?.environment === "production" || null;
}

function getServerKey(): string {
  if (_cachedServerKey === null) {
    // Config not loaded yet; trigger lazy load but can't await here.
    // Will throw on first call if not loaded. Caller should ensure config is available.
    throw new Error("MIDTRANS_SERVER_KEY not configured — set via Admin > Settings > Payment Gateway");
  }
  return _cachedServerKey;
}

function getBaseUrl(): string {
  const isProd = _cachedIsProduction ?? false;
  return isProd
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

function getApiUrl(): string {
  const isProd = _cachedIsProduction ?? false;
  return isProd
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

//// Public API ////

export interface MidtransTransaction {
  token: string;
  redirect_url: string;
}

export interface MidtransNotification {
  transaction_id: string;
  order_id: string;
  transaction_status:
    | "capture"
    | "settlement"
    | "pending"
    | "deny"
    | "cancel"
    | "expire"
    | "refund"
    | "partial_refund"
    | "authorize";
  fraud_status: "accept" | "deny" | "challenge";
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  status_code: string;
  signature_key: string;
}

/**
 * Initialize Midtrans config at startup.
 * Call this once before using Midtrans functions — otherwise lazy-load on first API call.
 */
export async function initMidtrans(): Promise<void> {
  await loadConfig();
  if (!_cachedServerKey) {
    console.warn("[midtrans] No active Midtrans config in DB. Transactions will fail.");
  }
}

// Create Snap transaction
export async function createTransaction(
  orderId: string,
  amount: number,
  customerDetails?: { name?: string; email?: string; phone?: string }
): Promise<MidtransTransaction> {
  await loadConfig(); // ensure fresh config
  const serverKey = getServerKey();
  const baseUrl = getBaseUrl();

  const auth = Buffer.from(serverKey + ":").toString("base64");

  const body: Record<string, unknown> = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    credit_card: {
      secure: true,
    },
  };

  if (customerDetails) {
    body.customer_details = customerDetails;
  }

  const response = await fetch(`${baseUrl}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Midtrans API error: ${response.status} ${err}`);
  }

  return response.json();
}

// Verify webhook notification signature
export function verifySignature(notification: MidtransNotification): boolean {
  const serverKey = _cachedServerKey;
  if (!serverKey) return false;

  const hash = createHash("sha512")
    .update(notification.order_id + notification.status_code + notification.gross_amount + serverKey)
    .digest("hex");

  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(String(notification.signature_key ?? ""), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Check transaction status
export async function getTransactionStatus(orderId: string): Promise<MidtransNotification> {
  await loadConfig();
  const serverKey = getServerKey();
  const apiUrl = getApiUrl();

  const auth = Buffer.from(serverKey + ":").toString("base64");

  const response = await fetch(`${apiUrl}/${orderId}/status`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Midtrans status check failed: ${response.status}`);
  }

  return response.json();
}

// Map Midtrans transaction status to our billing status
export function mapTransactionStatus(
  transactionStatus: string,
  fraudStatus: string
): "completed" | "pending" | "failed" | "refunded" {
  if (transactionStatus === "capture" || transactionStatus === "settlement") {
    return fraudStatus === "accept" ? "completed" : "failed";
  }
  if (transactionStatus === "pending") return "pending";
  if (transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "expire") {
    return "failed";
  }
  if (transactionStatus === "refund" || transactionStatus === "partial_refund") {
    return "refunded";
  }
  return "pending";
}

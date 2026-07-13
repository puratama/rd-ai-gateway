import { createHash } from "crypto";

// Midtrans Payment Gateway Helper
// Docs: https://docs.midtrans.com/

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

const BASE_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

const API_URL = IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

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

// Create Snap transaction
export async function createTransaction(
  orderId: string,
  amount: number,
  customerDetails?: { name?: string; email?: string; phone?: string }
): Promise<MidtransTransaction> {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY not configured — cannot create payment transaction");
  }

  const auth = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");

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

  const response = await fetch(`${BASE_URL}/transactions`, {
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
  if (!MIDTRANS_SERVER_KEY) return false;

  const hash = createHash("sha512")
    .update(notification.order_id + notification.status_code + notification.gross_amount + MIDTRANS_SERVER_KEY)
    .digest("hex");

  return hash === notification.signature_key;
}

// Check transaction status
export async function getTransactionStatus(orderId: string): Promise<MidtransNotification> {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY not configured — cannot check transaction status");
  }

  const auth = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");

  const response = await fetch(`${API_URL}/${orderId}/status`, {
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

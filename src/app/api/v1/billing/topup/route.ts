import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiError, corsOptions, withPublicCors } from "@/lib/public-api";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");
    const auth = apiKeyHeader || authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!auth) {
      return apiError("Unauthorized", 401, "invalid_api_key");
    }

    const { validateServerKey, getPlan, createBillingRecord, generateId } = await import("@/lib/server-store");
    const apiKey = await validateServerKey(auth);
    if (!apiKey) {
      return apiError("Invalid API key", 401, "invalid_api_key");
    }

    const body = await request.json();
    const { planId } = body;

    const plan = await getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const orderId = `TOPUP-${generateId()}-${Date.now()}`;

    const billingRecord = await createBillingRecord({
      userId: apiKey.userId,
      type: "package_purchase",
      amount: plan.price,
      status: "pending",
      midtransOrderId: orderId,
      planId,
      description: `Package: ${plan.name} - ${plan.billingPeriod}`,
    });

    try {
      const { createTransaction } = await import("@/lib/payment-gateway");
      const transaction = await createTransaction(orderId, plan.price);

      return withPublicCors(NextResponse.json({
        billing: billingRecord,
        transaction: {
          token: transaction.token,
          redirectUrl: transaction.redirectUrl,
          provider: transaction.provider,
        },
        plan,
      }));
    } catch {
      return apiError("Payment provider unavailable", 503, "provider_unavailable", "server_error");
    }
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500, "internal_error", "server_error");
  }
}

export function OPTIONS() {
  return corsOptions();
}

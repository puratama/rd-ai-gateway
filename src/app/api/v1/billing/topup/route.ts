import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { validateServerKey, getPlan, createBillingRecord, generateId, extendSubscription } = await import("@/lib/server-store");
    const apiKey = await validateServerKey(auth);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
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
      type: "subscription",
      amount: plan.price,
      status: "pending",
      midtransOrderId: orderId,
      planId,
      description: `Renewal: ${plan.name} - ${plan.billingPeriod}`,
    });

    try {
      const { createTransaction } = await import("@/lib/payment-gateway");
      const transaction = await createTransaction(orderId, plan.price);

      return NextResponse.json({
        billing: billingRecord,
        transaction: {
          token: transaction.token,
          redirectUrl: transaction.redirectUrl,
          provider: transaction.provider,
        },
        plan,
      });
    } catch {
      // Dev mode fallback - extend directly
      await extendSubscription(apiKey.userId, planId, plan.billingPeriod as import("@/lib/server-store").BillingPeriod);
      return NextResponse.json({
        billing: billingRecord,
        plan,
        note: "Payment not configured. Subscription extended directly (dev mode).",
        devMode: true,
      });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

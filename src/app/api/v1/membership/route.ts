import { NextRequest, NextResponse } from "next/server";

// GET /api/v1/membership - Check current subscription status
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { validateServerKey, getSubscriptionByKey, getPlan, loadPlans } = await import("@/lib/server-store");
    const apiKey = validateServerKey(auth);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const sub = getSubscriptionByKey(apiKey.id);
    const plans = loadPlans().filter((p) => p.isActive);

    return NextResponse.json({
      subscription: sub,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        billingPeriod: p.billingPeriod,
        features: p.features,
      })),
      currentPlan: sub ? getPlan(sub.planId) : getPlan("free"),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/membership - Subscribe to a plan (creates billing record)
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { validateServerKey, createSubscription, getPlan } = await import("@/lib/server-store");
    const apiKey = validateServerKey(auth);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, autoRenew = true } = body;

    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.price === 0) {
      // Free plan - just create subscription immediately
      const sub = createSubscription(apiKey.id, planId);
      return NextResponse.json({ subscription: sub, plan });
    }

    // For paid plans, create billing record with Midtrans
    const { createBillingRecord, generateId } = await import("@/lib/server-store");
    const orderId = `ORDER-${generateId()}-${Date.now()}`;

    const billingRecord = createBillingRecord({
      apiKeyId: apiKey.id,
      planId,
      amount: plan.price,
      currency: "IDR",
      status: "pending",
      midtransOrderId: orderId,
      billingPeriod: plan.billingPeriod,
      description: `${plan.name} - ${plan.billingPeriod}`,
    });

    // Try to create Midtrans transaction
    try {
      const { createTransaction } = await import("@/lib/midtrans");
      const transaction = await createTransaction(orderId, plan.price);

      return NextResponse.json({
        billing: billingRecord,
        transaction: {
          token: transaction.token,
          redirectUrl: transaction.redirect_url,
        },
        plan,
      });
    } catch (midtransError: unknown) {
      // Fallback: create subscription directly for development
      const sub = createSubscription(apiKey.id, planId);
      return NextResponse.json({
        subscription: sub,
        plan,
        note: "Payment not configured. Subscription activated directly.",
        devMode: true,
      });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

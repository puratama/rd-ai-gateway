import { NextRequest, NextResponse } from "next/server";

// GET /api/v1/membership - Check current subscription status
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { validateServerKey, getSubscriptionByKey, getPlan, loadPlans } = await import("@/lib/server-store");
    const apiKey = await validateServerKey(auth);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const sub = await getSubscriptionByKey(apiKey.id);
    const plans = (await loadPlans()).filter((p) => p.isActive);

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
      currentPlan: sub ? await getPlan(sub.planId) : await getPlan("free"),
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

    if (plan.price === 0) {
      // Free plan - just create subscription immediately
      const sub = await createSubscription(apiKey.userId, planId);
      return NextResponse.json({ subscription: sub, plan });
    }

    // For paid plans, create billing record with Midtrans
    const { createBillingRecord, generateId } = await import("@/lib/server-store");
    const orderId = `ORDER-${generateId()}-${Date.now()}`;

    const billingRecord = await createBillingRecord({
      userId: apiKey.userId,
      type: "subscription",
      amount: plan.price,
      status: "pending",
      midtransOrderId: orderId,
      planId,
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
    } catch {
      return NextResponse.json(
        { error: "Payment gateway unavailable. Please try again later." },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

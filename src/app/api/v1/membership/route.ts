import { NextRequest, NextResponse } from "next/server";

// GET /api/v1/membership - Check current packages & plan access
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { validateServerKey, getPlan, loadPlans } = await import("@/lib/server-store");
    const apiKey = await validateServerKey(auth);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/db");
    const packages = await prisma.userPackage.findMany({
      where: { userId: apiKey.userId, status: "active", expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    const plans = (await loadPlans()).filter((p) => p.isActive);

    return NextResponse.json({
      packages: packages.map((p) => ({
        id: p.id,
        planId: p.planId,
        tokensRemaining: p.tokensRemaining,
        tokensTotal: p.tokensTotal,
        expiresAt: p.expiresAt,
        plan: p.plan,
      })),
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        billingPeriod: p.billingPeriod,
        features: p.features,
      })),
      currentPlan: packages[0]?.plan ?? (await getPlan("free")),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/membership - Purchase a plan (creates package + billing record)
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { validateServerKey, getPlan } = await import("@/lib/server-store");
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
      // Free plan - create package immediately
      const { prisma } = await import("@/lib/db");
      const pkg = await prisma.userPackage.create({
        data: {
          userId: apiKey.userId,
          planId,
          status: "active",
          tokensTotal: plan.features.maxTokensPerMonth,
          tokensRemaining: plan.features.maxTokensPerMonth,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ package: pkg, plan });
    }

    // For paid plans, create billing record with Midtrans
    const { createBillingRecord, generateId } = await import("@/lib/server-store");
    const orderId = `ORDER-${generateId()}-${Date.now()}`;

    const billingRecord = await createBillingRecord({
      userId: apiKey.userId,
      type: "package_purchase",
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

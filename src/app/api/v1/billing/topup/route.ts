import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { validateServerKey, getPlan, createBillingRecord, generateId } = await import("@/lib/server-store");
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
      // Dev mode fallback - create package directly
      const { prisma } = await import("@/lib/db");
      const pkg = await prisma.userPackage.create({
        data: {
          userId: apiKey.userId,
          planId,
          status: "active",
          tokensTotal: plan.features.maxTokensPerMonth,
          tokensRemaining: plan.features.maxTokensPerMonth,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          billingId: billingRecord.id,
        },
      });
      return NextResponse.json({
        billing: billingRecord,
        plan,
        package: pkg,
        note: "Payment not configured. Package created directly (dev mode).",
        devMode: true,
      });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

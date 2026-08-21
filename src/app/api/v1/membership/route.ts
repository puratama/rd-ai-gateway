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

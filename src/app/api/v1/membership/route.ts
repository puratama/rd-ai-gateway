import { NextRequest, NextResponse } from "next/server";
import { corsOptions, withPublicCors } from "@/lib/public-api";

// GET /api/v1/membership - Check current packages & plan access
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");
    const auth = apiKeyHeader || authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!auth) {
      return withPublicCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const { validateServerKey, getPlan, loadPlans } = await import("@/lib/server-store");
    const apiKey = await validateServerKey(auth);
    if (!apiKey) {
      return withPublicCors(NextResponse.json({ error: "Invalid API key" }, { status: 401 }));
    }

    const { prisma } = await import("@/lib/db");
    const packages = await prisma.userPackage.findMany({
      where: { userId: apiKey.userId, status: "active", expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    const plans = (await loadPlans()).filter((p) => p.isActive);

    return withPublicCors(NextResponse.json({
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
    }));
  } catch (error: unknown) {
    return withPublicCors(NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 }));
  }
}

export function OPTIONS() {
  return corsOptions();
}

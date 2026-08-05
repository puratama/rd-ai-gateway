import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // 0. Resolve user & plan from Authorization header or session
  const { userId, plan } = await resolveUserPlan(request);

  // 1. Fetch all active AppModels as base
  let models = await fetchAppModels();

  if (models.length === 0) {
    return NextResponse.json({ data: [], fallbackAvailable: false });
  }

  // 2. Enrich display names from aggregator if available
  const aggModels = await fetchAggregatorModels().catch(() => []);
  if (aggModels.length > 0) {
    const aggMap = new Map(aggModels.map((m: Record<string, unknown>) => [String(m.id), String(m.name || "")]));
    models = models.map((m: Record<string, unknown>) => ({
      ...m,
      name: aggMap.get(String(m.id)) || m.name,
    }));
  }

  // 3. Filter by plan's allowedModels & allowedProviders
  const filtered = plan ? filterByPlan(models, plan) : models;

  return NextResponse.json({ data: filtered, fallbackAvailable: true });
}

// ─── Resolve user & plan ────────────────────────────────────────────

interface PlanInfo {
  allowedModels: string[];
  allModels: boolean;
  allowedProviders: string[];
  allProviders: boolean;
}

async function resolveUserPlan(
  request: NextRequest
): Promise<{ userId?: string; plan?: PlanInfo }> {
  try {
    const { prisma } = await import("@/lib/db");

    // Try API key first
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const apiKey = await prisma.apiKey.findUnique({
        where: { key: token, isActive: true },
        select: { userId: true },
      });
      if (apiKey) {
        const plan = await getUserPlan(prisma, apiKey.userId);
        return { userId: apiKey.userId, plan };
      }
    }

    // Fallback: session (chat page)
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    if (session?.sub) {
      const plan = await getUserPlan(prisma, session.sub);
      return { userId: session.sub, plan };
    }
  } catch {
    // ignore
  }

  return {};
}

async function getUserPlan(
  prisma: unknown,
  userId: string
): Promise<PlanInfo | undefined> {
  try {
    const p = prisma as {
      userPackage: {
        findFirst: (args: unknown) => Promise<{
          plan?: { allowedModels: string[]; allModels: boolean; allowedProviders: string[]; allProviders: boolean };
        } | null>;
      };
    };

    // Active package (prepaid token plan) — determines model access
    const pkg = await p.userPackage.findFirst({
      where: { userId, status: "active", expiresAt: { gt: new Date() } },
      select: { plan: { select: { allowedModels: true, allModels: true, allowedProviders: true, allProviders: true } } },
    });
    if (pkg?.plan) {
      return {
        allowedModels: pkg.plan.allowedModels ?? [],
        allModels: pkg.plan.allModels ?? true,
        allowedProviders: pkg.plan.allowedProviders ?? [],
        allProviders: pkg.plan.allProviders ?? true,
      };
    }

    // Free tier — read "free" plan defaults
    const { getPlan } = await import("@/lib/server-store");
    const freePlan = await getPlan("free");
    if (freePlan) {
      return {
        allowedModels: freePlan.features.allowedModels ?? [],
        allModels: freePlan.features.allModels ?? true,
        allowedProviders: freePlan.features.allowedProviders ?? [],
        allProviders: freePlan.features.allProviders ?? true,
      };
    }
  } catch {
    // ignore
  }
  return undefined;
}

// ─── Filtering ───────────────────────────────────────────────────────

function filterByPlan(
  models: Record<string, unknown>[],
  plan: PlanInfo
): Record<string, unknown>[] {
  return models.filter((m) => {
    const modelId = String(m.id || "").toLowerCase();
    const provider = String(m.provider || m.owned_by || "").toLowerCase();

    // allowedModels: allModels=true → semua; false → wajib list non-empty
    if (plan.allModels === false) {
      if (plan.allowedModels.length === 0) return false;
      if (!plan.allowedModels.some((a) => modelId.includes(a.toLowerCase()))) {
        return false;
      }
    }

    // allowedProviders: allProviders=true → semua; false → wajib list non-empty
    if (plan.allProviders === false) {
      if (plan.allowedProviders.length === 0) return false;
      if (!plan.allowedProviders.some((a) => provider.includes(a.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });
}

// ─── Data sources ────────────────────────────────────────────────────

async function fetchAppModels(): Promise<Record<string, unknown>[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const appModels = await prisma.appModel.findMany({
      where: { isActive: true },
      orderBy: [{ provider: "asc" }, { name: "asc" }],
    }) as unknown as Record<string, unknown>[];

    if (appModels.length === 0) return [];

    return appModels.map((m) => ({
      id: String(m.modelId || m.id || ""),
      object: "model" as const,
      created: Math.floor(
        m.createdAt ? new Date(m.createdAt as string).getTime() / 1000 : Date.now() / 1000
      ),
      owned_by: String(m.provider || ""),
      name: String(m.name || m.modelId || ""),
      provider: String(m.provider || "unknown"),
    }));
  } catch {
    return [];
  }
}

async function fetchAggregatorModels(): Promise<Record<string, unknown>[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const all = await prisma.aggregatorConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const agg = all.find((a: Record<string, unknown>) => a.apiKeyEnc);
    if (!agg?.baseUrl || !agg.apiKeyEnc) return [];

    const res = await fetch(`${agg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${agg.apiKeyEnc}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const body = await res.json();
    const list = body?.data || body?.models || [];
    if (!Array.isArray(list)) return [];

    return list.map((m: Record<string, unknown>) => ({
      id: String(m.id || ""),
      object: "model" as const,
      created: m.created ? Number(m.created) : Math.floor(Date.now() / 1000),
      owned_by: String(m.owned_by || m.provider || agg.name || ""),
      name: String(m.name || (typeof m.id === "string" ? m.id.split("/").pop() : m.id) || ""),
      provider: String(m.owned_by || m.provider || agg.name || "unknown"),
    }));
  } catch {
    return [];
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

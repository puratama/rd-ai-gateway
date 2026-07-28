import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // 0. Resolve user & plan from Authorization header or session
  const { userId, plan } = await resolveUserPlan(request);

  // 1. Fetch active AppModels (IDs + display names)
  const { prisma } = await import("@/lib/db");
  const activeAppModels = await prisma.appModel.findMany({
    where: { isActive: true },
    select: { modelId: true, name: true },
  });

  // Map modelId → displayName for merging into aggregator response
  const modelMap = new Map(
    activeAppModels.map((m: { modelId: string; name: string }) => [m.modelId, m.name])
  );

  // If no active models configured, return empty
  if (modelMap.size === 0) {
    return NextResponse.json({ data: [], fallbackAvailable: false });
  }

  // 2. Primary: aggregator models → filter + merge display name from AppModel
  let models = await fetchAggregatorModels();
  if (models.length > 0) {
    models = models
      .filter((m: Record<string, unknown>) => modelMap.has(String(m.id)))
      .map((m: Record<string, unknown>) => ({
        ...m,
        name: modelMap.get(String(m.id)) || m.name,
      }));
  }

  // 3. Fallback: AppModel-derived (if aggregator fails or no intersection)
  if (models.length === 0) {
    models = await fetchAppModels();
  }

  // 4. Filter by plan's allowedModels & allowedProviders
  const filtered = plan ? filterByPlan(models, plan) : models;

  return NextResponse.json({ data: filtered, fallbackAvailable: true });
}

// ─── Resolve user & plan ────────────────────────────────────────────

interface PlanInfo {
  allowedModels: string[];
  allowedProviders: string[];
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
      subscription: {
        findFirst: (args: unknown) => Promise<{
          plan?: { allowedModels: string[]; allowedProviders: string[] };
        } | null>;
      };
      userPackage: {
        findFirst: (args: unknown) => Promise<{
          plan?: { allowedModels: string[]; allowedProviders: string[] };
        } | null>;
      };
    };

    // Active subscription
    const sub = await p.subscription.findFirst({
      where: { userId, status: "active", endDate: { gt: new Date() } },
      select: { plan: { select: { allowedModels: true, allowedProviders: true } } },
    });
    if (sub?.plan) {
      return {
        allowedModels: sub.plan.allowedModels ?? [],
        allowedProviders: sub.plan.allowedProviders ?? [],
      };
    }

    // Active package
    const pkg = await p.userPackage.findFirst({
      where: { userId, status: "active", expiresAt: { gt: new Date() } },
      select: { plan: { select: { allowedModels: true, allowedProviders: true } } },
    });
    if (pkg?.plan) {
      return {
        allowedModels: pkg.plan.allowedModels ?? [],
        allowedProviders: pkg.plan.allowedProviders ?? [],
      };
    }

    // Free tier — get "free" plan
    const freePlan = await p.subscription.findFirst({
      where: { userId, status: "active", planId: "free" },
      select: { plan: { select: { allowedModels: true, allowedProviders: true } } },
    });
    if (freePlan?.plan) {
      return {
        allowedModels: freePlan.plan.allowedModels ?? [],
        allowedProviders: freePlan.plan.allowedProviders ?? [],
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

    // allowedModels: empty = all allowed; non-empty = only listed
    if (
      plan.allowedModels.length > 0 &&
      !plan.allowedModels.some((a) => modelId.includes(a.toLowerCase()))
    ) {
      return false;
    }

    // allowedProviders: empty = all providers; non-empty = only listed
    if (
      plan.allowedProviders.length > 0 &&
      !plan.allowedProviders.some((a) => provider.includes(a.toLowerCase()))
    ) {
      return false;
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
      context: m.contextWindow || undefined,
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

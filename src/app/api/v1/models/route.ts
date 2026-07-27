import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // 0. Resolve user & plan from Authorization header or session
  const { userId, plan } = await resolveUserPlan(request);

  // 1. Fetch active AppModels (IDs we allow)
  const { prisma } = await import("@/lib/db");
  const activeAppModels = await prisma.appModel.findMany({
    where: { isActive: true },
    select: { modelId: true },
  });
  const allowedModelIds = new Set(activeAppModels.map((m: { modelId: string }) => m.modelId));

  // 2. Primary: aggregator models → filter to only allowed ones
  let models = await fetchAggregatorModels();
  if (models.length > 0 && allowedModelIds.size > 0) {
    models = models.filter((m: Record<string, unknown>) => allowedModelIds.has(String(m.id)));
  }

  // 3. Fallback: AppModel-derived (if aggregator fails or no allowed intersection)
  if (models.length === 0 && allowedModelIds.size > 0) {
    models = await fetchAppModels();
  }

  // 4. Final fallback: hardcoded list (no AppModels registered at all)
  if (models.length === 0) {
    models = getFallbackModels() as unknown as Record<string, unknown>[];
  }

  // 5. Filter by plan's allowedModels & allowedProviders
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
      name: String(m.id || ""),
      provider: String(m.owned_by || m.provider || agg.name || "unknown"),
    }));
  } catch {
    return [];
  }
}

function getFallbackModels() {
  return [
    { id: "gpt-4o", object: "model", owned_by: "openai", name: "GPT-4o", context: 128000, provider: "OpenAI" },
    { id: "gpt-4o-mini", object: "model", owned_by: "openai", name: "GPT-4o Mini", context: 128000, provider: "OpenAI" },
    { id: "gpt-5", object: "model", owned_by: "openai", name: "GPT-5", context: 1000000, provider: "OpenAI" },
    { id: "o3", object: "model", owned_by: "openai", name: "o3", context: 200000, provider: "OpenAI" },
    { id: "claude-sonnet-4", object: "model", owned_by: "anthropic", name: "Claude Sonnet 4", context: 200000, provider: "Anthropic" },
    { id: "claude-haiku-3.5", object: "model", owned_by: "anthropic", name: "Claude Haiku 3.5", context: 200000, provider: "Anthropic" },
    { id: "claude-opus-4", object: "model", owned_by: "anthropic", name: "Claude Opus 4", context: 200000, provider: "Anthropic" },
    { id: "gemini-2.5-flash", object: "model", owned_by: "google", name: "Gemini 2.5 Flash", context: 1000000, provider: "Google" },
    { id: "deepseek-chat", object: "model", owned_by: "deepseek", name: "DeepSeek V3", context: 64000, provider: "DeepSeek" },
    { id: "deepseek-reasoner", object: "model", owned_by: "deepseek", name: "DeepSeek R1", context: 64000, provider: "DeepSeek" },
    { id: "llama-3.1-70b", object: "model", owned_by: "meta", name: "Llama 3.1 70B", context: 128000, provider: "Meta" },
    { id: "mistral-large", object: "model", owned_by: "mistral", name: "Mistral Large", context: 128000, provider: "Mistral" },
    { id: "mixtral-8x7b", object: "model", owned_by: "mistral", name: "Mixtral 8x7B", context: 32000, provider: "Mistral" },
  ];
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

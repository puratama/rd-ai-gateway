// Provider definitions and routing logic

export interface ProviderConfig {
  name: string;
  label: string;
  baseUrl: string;
  apiKeyEnc?: string; // DB-stored API key for aggregators
  apiKeyEnv?: string; // env var name for static providers
  models: string[];
  modelPrefixes: string[];
  priority: number;
}

// Load aggregator configs from DB (async) — returns all active aggregators in chain order
async function getAggregatorProviders(): Promise<ProviderConfig[]> {
  try {
    const { prisma } = await import("./db");
    const configs = await prisma.aggregatorConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    // Filter: only include aggregators with an API key stored in DB
    const active = configs.filter((c) => c.apiKeyEnc);
    if (active.length === 0) return [];

    let priority = -1;
    return active.map<ProviderConfig>((config) => {
      const slug = config.name.toLowerCase().replace(/\s+/g, "-");
      const p = priority--;
      return {
        name: slug,
        label: config.name,
        baseUrl: config.baseUrl,
        apiKeyEnc: config.apiKeyEnc, // store actual key for router use
        models: [],
        modelPrefixes: [],
        priority: p,
      };
    });
  } catch {
    return [];
  }
}

// Sync — static providers only (no DB lookup)
// All providers are configured via Admin → Settings → Aggregator (DB).
export function getProviders(): ProviderConfig[] {
  return [];
}

// Async — includes all active DB aggregators at highest priority (chained)
export async function getProvidersAsync(): Promise<ProviderConfig[]> {
  const providers = getProviders();
  const aggregators = await getAggregatorProviders();
  for (let i = aggregators.length - 1; i >= 0; i--) {
    providers.unshift(aggregators[i]);
  }
  return providers;
}

// Find providers for model (sync — no DB aggregator)
export function findProvidersForModel(modelId: string): ProviderConfig[] {
  const providers = getProviders();
  const id = modelId.toLowerCase();

  return providers.filter((p) => {
    if (p.models.some((m) => m.toLowerCase() === id)) return true;
    if (p.modelPrefixes.some((prefix) => id.startsWith(prefix))) return true;
    return false;
  });
}

// Find providers for model (async — includes DB aggregator)
export async function findProvidersForModelAsync(modelId: string): Promise<ProviderConfig[]> {
  const providers = await getProvidersAsync();
  const id = modelId.toLowerCase();

  return providers.filter((p) => {
    // Aggregator always matches — it's an OpenAI-compatible proxy that handles model routing itself
    if (p.apiKeyEnc) return true;
    if (p.models.some((m) => m.toLowerCase() === id)) return true;
    if (p.modelPrefixes.some((prefix) => id.startsWith(prefix))) return true;
    return false;
  });
}

// Get API key for a provider
export function getProviderApiKey(provider: ProviderConfig): string | null {
  // Aggregator: use DB-stored key
  if (provider.apiKeyEnc) return provider.apiKeyEnc;
  // Static provider: use env var
  if (provider.apiKeyEnv) return process.env[provider.apiKeyEnv] || null;
  return null;
}

// Check if provider is configured (has API key)
export function isProviderConfigured(provider: ProviderConfig): boolean {
  if (provider.apiKeyEnc) return true;
  if (provider.apiKeyEnv) return !!process.env[provider.apiKeyEnv];
  return false;
}

// Get all models across all providers (for model listing)
export function getAllProviderModels(): { id: string; provider: string; context?: number }[] {
  const models: { id: string; provider: string; context?: number }[] = [];
  const providers = getProviders();

  for (const p of providers) {
    for (const modelId of p.models) {
      models.push({
        id: modelId,
        provider: p.name,
        context: getDefaultContext(modelId),
      });
    }
  }

  return models;
}

// Default context windows for known models
function getDefaultContext(modelId: string): number | undefined {
  const id = modelId.toLowerCase();
  if (id.includes("gpt-4o") || id.includes("gpt-4")) return 128000;
  if (id.includes("gpt-3.5")) return 16384;
  if (id.includes("o1") || id.includes("o3")) return 200000;
  if (id.includes("gpt-5")) return 1000000;
  if (id.includes("claude-sonnet-4") || id.includes("claude-opus-4")) return 200000;
  if (id.includes("claude-haiku")) return 200000;
  if (id.includes("claude-3")) return 200000;
  if (id.includes("deepseek")) return 64000;
  return undefined;
}

// Error classification for fallback decisions
export function shouldFallback(error: unknown): boolean {
  if (!error) return false;
  const msg = String(error instanceof Error ? error.message : error).toLowerCase();
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid api key")) return false;
  if (msg.includes("400") || msg.includes("bad request")) return false;
  if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("econnrefused")) return true;
  if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("service unavailable")) return true;
  if (msg.includes("timeout") || msg.includes("timed out")) return true;
  if (msg.includes("429") || msg.includes("rate limit")) return true;
  if (msg.includes("404")) return true;
  return true;
}

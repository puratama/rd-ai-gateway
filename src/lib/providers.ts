// Provider definitions and routing logic

export interface ProviderConfig {
  name: string;
  label: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: string[];
  modelPrefixes: string[];
  priority: number;
}

// Load aggregator config from DB (async)
async function getAggregatorProvider(): Promise<ProviderConfig | null> {
  try {
    const { getAggregatorConfig } = await import("./server-store");
    const config = await getAggregatorConfig();
    if (!config || !config.isActive) return null;
    const apiKey = process.env.AGGREGATOR_API_KEY || "";
    if (!apiKey) return null;
    return {
      name: config.name.toLowerCase().replace(/\s+/g, "-"),
      label: config.name,
      baseUrl: config.baseUrl,
      apiKeyEnv: "AGGREGATOR_API_KEY",
      models: [],
      modelPrefixes: [],
      priority: -1,
    };
  } catch {
    return null;
  }
}

// Sync — static providers only (no DB lookup)
export function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  providers.push({
    name: "puter",
    label: "Puter",
    baseUrl: "[REDACTED-URL]",
    apiKeyEnv: "PUTER_AUTH_TOKEN",
    models: [],
    modelPrefixes: [],
    priority: 0,
  });

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: "openai",
      label: "OpenAI",
      baseUrl: "[REDACTED-URL]",
      apiKeyEnv: "OPENAI_API_KEY",
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3", "o3-mini", "gpt-5"],
      modelPrefixes: ["gpt-", "o1", "o3", "dall-e", "tts-", "whisper-"],
      priority: 1,
    });
  }

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: "deepseek",
      label: "DeepSeek",
      baseUrl: "[REDACTED-URL]",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      models: ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-pro"],
      modelPrefixes: ["deepseek-"],
      priority: 2,
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      name: "anthropic",
      label: "Anthropic",
      baseUrl: "[REDACTED-URL]",
      apiKeyEnv: "ANTHROPIC_API_KEY",
      models: ["claude-sonnet-4", "claude-haiku-3.5", "claude-opus-4", "claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus"],
      modelPrefixes: ["claude-"],
      priority: 3,
    });
  }

  return providers;
}

// Async — includes DB aggregator at highest priority
export async function getProvidersAsync(): Promise<ProviderConfig[]> {
  const providers = getProviders();
  const aggregator = await getAggregatorProvider();
  if (aggregator) providers.unshift(aggregator);
  return providers;
}

// Find providers for model (sync — no DB aggregator)
export function findProvidersForModel(modelId: string): ProviderConfig[] {
  const providers = getProviders();
  const id = modelId.toLowerCase();

  return providers.filter((p) => {
    if (p.models.some((m) => m.toLowerCase() === id)) return true;
    if (p.modelPrefixes.some((prefix) => id.startsWith(prefix))) return true;
    if (p.name === "puter") return true;
    return false;
  });
}

// Find providers for model (async — includes DB aggregator)
export async function findProvidersForModelAsync(modelId: string): Promise<ProviderConfig[]> {
  const providers = await getProvidersAsync();
  const id = modelId.toLowerCase();

  return providers.filter((p) => {
    if (p.models.some((m) => m.toLowerCase() === id)) return true;
    if (p.modelPrefixes.some((prefix) => id.startsWith(prefix))) return true;
    if (p.name === "puter" || p.apiKeyEnv === "AGGREGATOR_API_KEY") return true;
    return false;
  });
}

// Get API key for a provider
export function getProviderApiKey(provider: ProviderConfig): string | null {
  return process.env[provider.apiKeyEnv] || null;
}

// Check if provider is configured (has API key)
export function isProviderConfigured(provider: ProviderConfig): boolean {
  if (provider.name === "puter") return true;
  return !!process.env[provider.apiKeyEnv];
}

// Get all models across all providers (for model listing)
export function getAllProviderModels(): { id: string; provider: string; context?: number }[] {
  const models: { id: string; provider: string; context?: number }[] = [];
  const providers = getProviders();

  for (const p of providers) {
    if (p.name === "puter") continue;
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

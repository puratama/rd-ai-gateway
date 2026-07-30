// Provider definitions and routing logic

export interface ProviderKey {
  id: string;        // unique key identifier
  key: string;       // the actual API key
  pool: string;      // pool/group name this key belongs to
}

export interface ProviderConfig {
  name: string;
  label: string;
  baseUrl: string;
  apiKeyEnc?: string;   // DB-stored API key for aggregators (single key)
  apiKeyEnv?: string;   // env var name for static providers
  apiKeys?: ProviderKey[]; // key pool — multiple keys for load distribution
  apiKeyPoolStrategy?: "round-robin" | "random" | "least-used";
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

// ─── Key Pool State (runtime, not persisted) ──────────────────────────────

const keyPoolIndex = new Map<string, number>();         // pool name → round-robin index
const keyUsageCount = new Map<string, number>();         // key id → usage count
const keyCooldowns = new Map<string, number>();          // key id → cooldown until timestamp
const keyFailureCount = new Map<string, number>();       // key id → consecutive failures

const KEY_COOLDOWN_MS = 60_000;     // 1 min cooldown after rate limit
const KEY_MAX_FAILURES = 3;         // max failures before cooldown

/** Mark a key as rate-limited (cooldown). Returns true if key was put on cooldown. */
export function cooldownKey(keyId: string): boolean {
  keyCooldowns.set(keyId, Date.now() + KEY_COOLDOWN_MS);
  return true;
}

/** Mark a key as failed. Auto-cooldowns after KEY_MAX_FAILURES. */
export function markKeyFailure(keyId: string): void {
  const count = (keyFailureCount.get(keyId) || 0) + 1;
  keyFailureCount.set(keyId, count);
  if (count >= KEY_MAX_FAILURES) {
    cooldownKey(keyId);
  }
}

/** Mark a key as successful — reset failure count. */
export function markKeySuccess(keyId: string): void {
  keyFailureCount.delete(keyId);
}

/** Check if a key is on cooldown. */
export function isKeyOnCooldown(keyId: string): boolean {
  const until = keyCooldowns.get(keyId);
  if (!until) return false;
  if (Date.now() > until) {
    keyCooldowns.delete(keyId);
    keyFailureCount.delete(keyId);
    return false;
  }
  return true;
}

/** Clear all key cooldowns (e.g. on config change). */
export function clearKeyCooldowns(): void {
  keyCooldowns.clear();
  keyFailureCount.clear();
  keyPoolIndex.clear();
}

/** Get available (non-cooldown) keys from a provider's key pool. */
export function getAvailableKeys(provider: ProviderConfig): ProviderKey[] {
  if (!provider.apiKeys || provider.apiKeys.length === 0) return [];
  return provider.apiKeys.filter((k) => !isKeyOnCooldown(k.id));
}

/** Get the next key from a pool using the configured strategy. */
export function getNextPoolKey(provider: ProviderConfig): ProviderKey | null {
  const available = getAvailableKeys(provider);
  if (available.length === 0) return null;

  const strategy = provider.apiKeyPoolStrategy || "round-robin";

  switch (strategy) {
    case "round-robin": {
      const poolName = provider.name;
      const idx = keyPoolIndex.get(poolName) || 0;
      const key = available[idx % available.length];
      keyPoolIndex.set(poolName, idx + 1);
      return key;
    }
    case "random": {
      return available[Math.floor(Math.random() * available.length)];
    }
    case "least-used": {
      let min = Infinity;
      let selected = available[0];
      for (const k of available) {
        const count = keyUsageCount.get(k.id) || 0;
        if (count < min) {
          min = count;
          selected = k;
        }
      }
      return selected;
    }
    default:
      return available[0];
  }
}

// Get API key for a provider (supports key pools)
export function getProviderApiKey(provider: ProviderConfig): { key: string; keyId?: string } | null {
  // Key pool mode
  if (provider.apiKeys && provider.apiKeys.length > 0) {
    const poolKey = getNextPoolKey(provider);
    if (!poolKey) return null;
    keyUsageCount.set(poolKey.id, (keyUsageCount.get(poolKey.id) || 0) + 1);
    return { key: poolKey.key, keyId: poolKey.id };
  }

  // Single key mode (backward compat)
  if (provider.apiKeyEnc) return { key: provider.apiKeyEnc };
  if (provider.apiKeyEnv) {
    const envVal = process.env[provider.apiKeyEnv];
    if (envVal) return { key: envVal };
  }
  return null;
}

// Check if provider is configured (has API key)
export function isProviderConfigured(provider: ProviderConfig): boolean {
  if (provider.apiKeys && provider.apiKeys.length > 0) return true;
  if (provider.apiKeyEnc) return true;
  if (provider.apiKeyEnv) return !!process.env[provider.apiKeyEnv];
  return false;
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
  if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("econnrefused")) return true;
  if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("service unavailable")) return true;
  if (msg.includes("timeout") || msg.includes("timed out")) return true;
  if (msg.includes("429") || msg.includes("rate limit")) return true;
  if (msg.includes("404")) return true;
  return true; // all other errors (including 400/model-not-found) → fallback to next provider
}

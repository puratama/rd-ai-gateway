// Advanced Routing Engine — retry, circuit breaker, load balancing, cost-based routing
// Extends llm-router.ts with production-grade features

import type { ProviderConfig } from "./providers";

// ─── Types ─────────────────────────────────────────────────────────────────

export type RoutingStrategy =
  | "simple-shuffle"    // random distribution (default)
  | "least-busy"        // fewest active requests
  | "latency-based"     // lowest avg response time
  | "cost-based";       // lowest cost per token

export interface RouterEngineConfig {
  strategy: RoutingStrategy;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  circuitBreakerThreshold: number; // failures before cooldown
  circuitBreakerCooldownMs: number;
}

const DEFAULT_CONFIG: RouterEngineConfig = {
  strategy: "simple-shuffle",
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  circuitBreakerThreshold: 3,
  circuitBreakerCooldownMs: 30000,
};

// ─── Circuit Breaker State ──────────────────────────────────────────────────

const failureCounts = new Map<string, number>();
const cooldowns = new Map<string, number>(); // provider → cooldown until timestamp
const activeRequests = new Map<string, number>(); // provider → active request count
const latencyStore = new Map<string, number[]>(); // provider → recent latencies (keep last 10)

const MAX_LATENCIES = 10;

export function isOnCooldown(provider: string): boolean {
  const until = cooldowns.get(provider);
  if (!until) return false;
  if (Date.now() > until) {
    // Cooldown expired, reset
    failureCounts.delete(provider);
    cooldowns.delete(provider);
    return false;
  }
  return true;
}

export function markSuccess(provider: string, latencyMs: number) {
  // Reset failure count on success
  failureCounts.delete(provider);
  cooldowns.delete(provider);
  // Track latency
  const latencies = latencyStore.get(provider) || [];
  latencies.push(latencyMs);
  if (latencies.length > MAX_LATENCIES) latencies.shift();
  latencyStore.set(provider, latencies);
}

export function markFailure(provider: string, threshold: number, cooldownMs: number) {
  const count = (failureCounts.get(provider) || 0) + 1;
  failureCounts.set(provider, count);
  if (count >= threshold) {
    cooldowns.set(provider, Date.now() + cooldownMs);
  }
}

// ─── Active Request Tracking ────────────────────────────────────────────────

export function trackStart(provider: string) {
  activeRequests.set(provider, (activeRequests.get(provider) || 0) + 1);
}

export function trackEnd(provider: string) {
  const current = activeRequests.get(provider) || 1;
  activeRequests.set(provider, Math.max(0, current - 1));
}

function getActiveCount(provider: string): number {
  return activeRequests.get(provider) || 0;
}

function getAvgLatency(provider: string): number {
  const latencies = latencyStore.get(provider);
  if (!latencies || latencies.length === 0) return 1000; // default 1s for unknown
  return latencies.reduce((a, b) => a + b, 0) / latencies.length;
}

// ─── Sorting Strategies ─────────────────────────────────────────────────────

export async function sortProviders(
  providers: ProviderConfig[],
  strategy: RoutingStrategy,
  modelId?: string
): Promise<ProviderConfig[]> {
  // Filter out providers on cooldown
  const available = providers.filter((p) => !isOnCooldown(p.name));
  if (available.length === 0) return providers; // fallback to all if all on cooldown

  switch (strategy) {
    case "simple-shuffle":
      return shuffle(available);

    case "least-busy":
      return available.sort((a, b) => getActiveCount(a.name) - getActiveCount(b.name));

    case "latency-based":
      return available.sort((a, b) => getAvgLatency(a.name) - getAvgLatency(b.name));

    case "cost-based":
      return sortByCost(available, modelId);

    default:
      return available;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Cost-based Sorting ─────────────────────────────────────────────────────

// Lazy-load pricing data
let pricingCache: Map<string, number> | null = null;

async function getCostMap(): Promise<Map<string, number>> {
  if (pricingCache) return pricingCache;

  try {
    const { getAllPricedModels } = await import("./pricing-engine");
    const models = await getAllPricedModels();
    pricingCache = new Map();
    for (const m of models) {
      // Use sellPricePer1kPrompt as proxy for routing cost
      const cost = m.sellPricePer1kPrompt ?? m.costPer1kPrompt ?? Infinity;
      pricingCache.set(m.modelId, Number(cost));
    }
    return pricingCache;
  } catch {
    return new Map();
  }
}

async function sortByCost(providers: ProviderConfig[], modelId?: string): Promise<ProviderConfig[]> {
  if (!modelId) return providers;

  const costMap = await getCostMap();
  const modelCost = costMap.get(modelId);

  // If model is found in pricing DB, sort by provider priority (cheaper providers get priority)
  // ponytail: for now, use provider priority as proxy for cost since we don't have per-provider cost data
  // Upgrade path: add costPer1kPrompt to ProviderConfig from AppModel per-provider pricing
  return providers.sort((a, b) => a.priority - b.priority);
}

// ─── Retry Logic ────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getBackoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  // Exponential backoff with jitter
  const exponential = baseMs * 2 ** attempt;
  const jitter = Math.random() * 0.3 * exponential; // 0-30% jitter
  return Math.min(exponential + jitter, maxMs);
}

// ─── Observability Hooks ────────────────────────────────────────────────────

export interface LLMRequestLog {
  userId: string;
  model: string;
  provider: string;
  attempt: number;
  success: boolean;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  error?: string;
  strategy: RoutingStrategy;
}

const logHandlers: Array<(log: LLMRequestLog) => void> = [];

export function registerLogHandler(handler: (log: LLMRequestLog) => void) {
  logHandlers.push(handler);
}

export function emitRequestLog(log: LLMRequestLog) {
  for (const handler of logHandlers) {
    try { handler(log); } catch {}
  }
}

// Default console logger (always active)
registerLogHandler((log) => {
  const status = log.success ? "✓" : "✗";
  const extra = log.error ? ` err=${log.error.slice(0, 80)}` : "";
  console.log(
    `[LLM] ${status} ${log.provider}/${log.model} ${log.latencyMs}ms ` +
    `tokens=${log.totalTokens} attempt=${log.attempt} strategy=${log.strategy}${extra}`
  );
});

// Optional: Langfuse integration
try {
  const langfuseHost = process.env.LANGFUSE_HOST;
  const langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY;

  if (langfuseHost && langfusePublicKey && langfuseSecretKey) {
    registerLogHandler(async (log) => {
      try {
        await fetch(`${langfuseHost}/api/public/ingestion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${langfusePublicKey}:${langfuseSecretKey}`).toString("base64")}`,
          },
          body: JSON.stringify({
            batch: [{
              id: crypto.randomUUID(),
              type: "trace-create",
              timestamp: new Date().toISOString(),
              body: {
                name: `${log.provider}/${log.model}`,
                userId: log.userId,
                metadata: {
                  provider: log.provider,
                  model: log.model,
                  latencyMs: log.latencyMs,
                  promptTokens: log.promptTokens,
                  completionTokens: log.completionTokens,
                  totalTokens: log.totalTokens,
                  attempt: log.attempt,
                  success: log.success,
                  error: log.error,
                  strategy: log.strategy,
                },
              },
            }],
          }),
        });
      } catch {}
    });
  }
} catch {}

// ─── Config ─────────────────────────────────────────────────────────────────

let currentConfig: RouterEngineConfig = { ...DEFAULT_CONFIG };

export function getRouterConfig(): RouterEngineConfig {
  return currentConfig;
}

export function updateRouterConfig(partial: Partial<RouterEngineConfig>) {
  Object.assign(currentConfig, partial);
  if (currentConfig.strategy === "cost-based") {
    pricingCache = null; // invalidate cache on config change
  }
}

// LLM Router — routes requests to providers with retry, fallback, load balancing, circuit breaker, cost routing
import {
  findProvidersForModelAsync,
  getProviderApiKey,
  shouldFallback,
  type ProviderConfig,
} from "./providers";
import {
  sortProviders,
  trackStart,
  trackEnd,
  markSuccess,
  markFailure,
  sleep,
  getBackoffDelay,
  emitRequestLog,
  getRouterConfig,
  type RoutingStrategy,
} from "./router-engine";

export interface RouterRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  preferProvider?: string; // "puter" | "aggregator" — used to prioritize provider based on user plan
  userId?: string;        // for observability
  routingStrategy?: RoutingStrategy; // override default strategy per-request
}

export interface RouterResult {
  success: boolean;
  data?: Response;
  error?: string;
  provider: string;
  attempts: { provider: string; status: number; error?: string }[];
}

// Try a provider with retry + exponential backoff
async function tryProviderWithRetry(
  provider: ProviderConfig,
  req: RouterRequest,
  signal?: AbortSignal
): Promise<{ response: Response; provider: string }> {
  const { maxRetries, baseDelayMs, maxDelayMs } = getRouterConfig();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff before retry
      const delay = getBackoffDelay(attempt - 1, baseDelayMs, maxDelayMs);
      await sleep(delay);
    }

    try {
      const result = await tryProviderRaw(provider, req, signal);
      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message.toLowerCase();

      // Only retry on transient errors
      if (msg.includes("fetch failed") || msg.includes("network") ||
          msg.includes("econnrefused") || msg.includes("timeout") ||
          msg.includes("timed out") || msg.includes("500") ||
          msg.includes("502") || msg.includes("503") ||
          msg.includes("service unavailable") || msg.includes("429")) {
        continue; // retry
      }
      // Non-retryable errors (401, 400, bad request etc.) — stop immediately
      throw lastError;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

// Raw provider call (unchanged from original tryProvider)
async function tryProviderRaw(
  provider: ProviderConfig,
  req: RouterRequest,
  signal?: AbortSignal
): Promise<{ response: Response; provider: string }> {
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider.name}`);
  }

  const url = `${provider.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.name === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    stream: req.stream || false,
  };
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.max_tokens !== undefined) body.max_tokens = req.max_tokens;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  return { response, provider: provider.name };
}

// Main router: try providers in order with retry, load balancing, circuit breaker, fallback
export async function routeRequest(
  req: RouterRequest,
  signal?: AbortSignal
): Promise<RouterResult> {
  const providers = await findProvidersForModelAsync(req.model);
  const attempts: { provider: string; status: number; error?: string }[] = [];
  const startTime = Date.now();
  const config = getRouterConfig();
  const strategy = req.routingStrategy || config.strategy;

  if (providers.length === 0) {
    return {
      success: false,
      error: `No provider found for model: ${req.model}`,
      provider: "none",
      attempts,
    };
  }

  // Sort providers by priority + preferred + strategy
  let sortedProviders = providers.sort((a, b) => {
    if (req.preferProvider) {
      const aMatch = a.name === req.preferProvider || a.name.includes(req.preferProvider) ? 0 : 1;
      const bMatch = b.name === req.preferProvider || b.name.includes(req.preferProvider) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return a.priority - b.priority;
  });

  // Apply load balancing / cost-based strategy (only for non-preferProvider requests)
  if (!req.preferProvider) {
    sortedProviders = await sortProviders(sortedProviders, strategy, req.model);
  }

  let lastError = "";

  for (const provider of sortedProviders) {
    // Check circuit breaker — skip provider on cooldown
    const { isOnCooldown } = await import("./router-engine");
    if (isOnCooldown(provider.name)) {
      attempts.push({ provider: provider.name, status: 0, error: "circuit-breaker: cooldown" });
      continue;
    }

    const providerStart = Date.now();
    trackStart(provider.name);

    try {
      const { response } = await tryProviderWithRetry(provider, req, signal);
      const latency = Date.now() - providerStart;

      if (response.ok) {
        trackEnd(provider.name);
        markSuccess(provider.name, latency);
        attempts.push({ provider: provider.name, status: response.status });

        // Observability log
        emitRequestLog({
          userId: req.userId || "unknown",
          model: req.model,
          provider: provider.name,
          attempt: attempts.length,
          success: true,
          latencyMs: latency,
          promptTokens: 0,  // filled after response via completions route
          completionTokens: 0,
          totalTokens: 0,
          strategy,
        });

        return {
          success: true,
          data: response,
          provider: provider.name,
          attempts,
        };
      }

      // Error response from provider
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.text();
        if (errBody) errorMsg = `${response.status}: ${errBody.slice(0, 200)}`;
      } catch {}

      trackEnd(provider.name);
      markFailure(provider.name, config.circuitBreakerThreshold, config.circuitBreakerCooldownMs);
      attempts.push({ provider: provider.name, status: response.status, error: errorMsg });
      lastError = errorMsg;

      emitRequestLog({
        userId: req.userId || "unknown",
        model: req.model,
        provider: provider.name,
        attempt: attempts.length,
        success: false,
        latencyMs: latency,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        error: errorMsg,
        strategy,
      });

      // Non-fallbackable errors — stop here
      if (!shouldFallback({ message: errorMsg })) {
        return { success: false, error: errorMsg, provider: provider.name, attempts };
      }

    } catch (error: unknown) {
      if (signal?.aborted) throw error;

      const latency = Date.now() - providerStart;
      trackEnd(provider.name);

      const errorMsg = error instanceof Error ? error.message : String(error);
      markFailure(provider.name, config.circuitBreakerThreshold, config.circuitBreakerCooldownMs);
      attempts.push({ provider: provider.name, status: 0, error: errorMsg });
      lastError = errorMsg;

      emitRequestLog({
        userId: req.userId || "unknown",
        model: req.model,
        provider: provider.name,
        attempt: attempts.length,
        success: false,
        latencyMs: latency,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        error: errorMsg,
        strategy,
      });

      if (!shouldFallback(error)) {
        return { success: false, error: errorMsg, provider: provider.name, attempts };
      }
    }
  }

  const totalTime = Date.now() - startTime;
  return {
    success: false,
    error: lastError || "All providers failed",
    provider: sortedProviders[sortedProviders.length - 1]?.name || "none",
    attempts,
  };
}

// Try to find any working provider (for streaming convenience)
export async function routeStreaming(
  req: RouterRequest,
  signal?: AbortSignal
): Promise<Response> {
  const result = await routeRequest(req, signal);
  if (!result.success || !result.data) {
    throw new Error(result.error || "All providers failed");
  }
  return result.data;
}

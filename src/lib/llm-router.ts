// LLM Router - routes requests to providers with auto-fallback
import {
  findProvidersForModelAsync,
  getProviderApiKey,
  shouldFallback,
  type ProviderConfig,
} from "./providers";

export interface RouterRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface RouterResult {
  success: boolean;
  data?: Response;
  error?: string;
  provider: string;
  attempts: { provider: string; status: number; error?: string }[];
}

// Try a provider and return the fetch Response
async function tryProvider(
  provider: ProviderConfig,
  req: RouterRequest,
  signal?: AbortSignal
): Promise<{ response: Response; provider: string }> {
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider.name}`);
  }

  // Build the endpoint URL
  const url = `${provider.baseUrl}/chat/completions`;

  // Build headers - most providers use Bearer auth (OpenAI-compatible)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.name === "anthropic") {
    // Anthropic uses x-api-key header
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    // Standard Bearer auth for OpenAI-compatible providers
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

// Main router: try providers in priority order with fallback
export async function routeRequest(
  req: RouterRequest,
  signal?: AbortSignal
): Promise<RouterResult> {
  const providers = await findProvidersForModelAsync(req.model);
  const attempts: { provider: string; status: number; error?: string }[] = [];

  if (providers.length === 0) {
    return {
      success: false,
      error: `No provider found for model: ${req.model}`,
      provider: "none",
      attempts,
    };
  }

  // Sort by priority
  providers.sort((a, b) => a.priority - b.priority);

  let lastError = "";

  for (const provider of providers) {
    try {
      const { response } = await tryProvider(provider, req, signal);

      if (response.ok) {
        attempts.push({ provider: provider.name, status: response.status });
        return {
          success: true,
          data: response,
          provider: provider.name,
          attempts,
        };
      }

      // Parse error for fallback decision
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.text();
        if (errBody) errorMsg = `${response.status}: ${errBody.slice(0, 200)}`;
      } catch {}

      attempts.push({ provider: provider.name, status: response.status, error: errorMsg });
      lastError = errorMsg;

      // If we should NOT fallback on this error, stop here
      if (!shouldFallback({ message: errorMsg })) {
        return {
          success: false,
          error: errorMsg,
          provider: provider.name,
          attempts,
        };
      }

      // Continue to next provider (fallback)
    } catch (error: unknown) {
      if (signal?.aborted) throw error;

      const errorMsg = error instanceof Error ? error.message : String(error);
      attempts.push({ provider: provider.name, status: 0, error: errorMsg });
      lastError = errorMsg;

      // If we should NOT fallback, stop
      if (!shouldFallback(error)) {
        return {
          success: false,
          error: errorMsg,
          provider: provider.name,
          attempts,
        };
      }
      // Continue to next provider
    }
  }

  // All providers failed
  return {
    success: false,
    error: lastError || "All providers failed",
    provider: providers[providers.length - 1]?.name || "none",
    attempts,
  };
}

// Try to find any working provider for a model (for streaming)
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

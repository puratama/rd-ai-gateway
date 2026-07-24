import { NextResponse } from "next/server";
import { getAllProviderModels, getProviders } from "@/lib/providers";

const PUTER_MODELS_URL = "https://api.puter.com/puterai/chat/models/details";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Fetch models from Puter API (primary source)
    const puterToken = process.env.PUTER_AUTH_TOKEN;
    let puterModels: Array<Record<string, unknown>> = [];

    if (puterToken && puterToken !== "your-puter-auth-token-here") {
      try {
        const response = await fetch(PUTER_MODELS_URL, {
          headers: { Authorization: `Bearer ${puterToken}` },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.models && Array.isArray(data.models)) {
            puterModels = data.models as Array<Record<string, unknown>>;
          }
        }
      } catch (e) {
        console.error("[models] Failed to fetch from Puter:", e);
      }
    }

    // 2. Get all direct provider models
    const directModels = getAllProviderModels();

    // 3. Get configured providers info
    const configuredProviders = getProviders()
      .filter((p) => p.name !== "puter")
      .map((p) => ({
        name: p.name,
        label: p.label,
        configured: !!(p.apiKeyEnc || (p.apiKeyEnv && process.env[p.apiKeyEnv])),
        models: p.models,
      }));

    // 4. Transform Puter models to OpenAI-compatible format
    const transformed = puterModels.map((m: Record<string, unknown>) => ({
      id: String(m.id || m.puterId || ""),
      object: "model" as const,
      created: m.release_date
        ? new Date(m.release_date as string).getTime() / 1000
        : Math.floor(Date.now() / 1000),
      owned_by: String(m.provider || "puter"),
      name: String(m.name || m.id || ""),
      context: m.context || undefined,
      max_tokens: m.max_tokens || undefined,
      provider: String(m.provider || "unknown"),
      modalities: m.modalities || [],
      open_weights: m.open_weights || false,
      tool_call: m.tool_call || false,
      pricing: m.costs
        ? {
            prompt: (m.costs as Record<string, number>).prompt_cost_per_million
              ? (m.costs as Record<string, number>).prompt_cost_per_million / 100
              : 0,
            completion: (m.costs as Record<string, number>).completion_cost_per_million
              ? (m.costs as Record<string, number>).completion_cost_per_million / 100
              : 0,
          }
        : undefined,
    }));

    // 5. Add direct provider models that might not be in Puter's list
    for (const dm of directModels) {
      if (!transformed.some((t: { id: string }) => t.id === dm.id)) {
        transformed.push({
          id: dm.id,
          object: "model",
          created: Math.floor(Date.now() / 1000),
          owned_by: dm.provider,
          name: dm.id,
          context: dm.context,
          provider: dm.provider,
        } as (typeof transformed)[number]);
      }
    }

    // Mark models that have fallback providers
    const result = {
      data: transformed,
      providers: configuredProviders,
      fallbackAvailable: configuredProviders.filter((p) => p.configured).length > 0,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[models] Error:", error instanceof Error ? error.message : error);

    // Return fallback model list on error
    const fallbackModels = getFallbackModels();
    return NextResponse.json({
      data: fallbackModels,
      providers: getProviders()
        .filter((p) => p.name !== "puter")
        .map((p) => ({
          name: p.name,
          label: p.label,
          configured: !!(p.apiKeyEnc || (p.apiKeyEnv && process.env[p.apiKeyEnv])),
          models: p.models,
        })),
      fallbackAvailable: true,
    });
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

"use client";

import type { ModelInfo } from "@/types";

// Cache untuk daftar models
let modelsCache: ModelInfo[] | null = null;

export async function getModels(): Promise<ModelInfo[]> {
  if (modelsCache) return modelsCache;

  try {
    const response = await fetch("/api/v1/models");
    if (!response.ok) throw new Error("Failed to fetch models");

    const data = await response.json();
    if (data?.data && Array.isArray(data.data)) {
      modelsCache = data.data.map((m: Record<string, unknown>) => ({
        id: String(m.id || ""),
        name: String(m.id || m.name || ""),
        provider: getProviderFromModel(String(m.id || "")),
        context: m.context ? Number(m.context) : undefined,
        description: m.description ? String(m.description) : undefined,
      }));
      return modelsCache as ModelInfo[];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
}

function getProviderFromModel(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes("gpt") || id.includes("openai") || id.includes("o1") || id.includes("o3") || id.includes("dall")) return "OpenAI";
  if (id.includes("claude") || id.includes("anthropic")) return "Anthropic";
  if (id.includes("gemini") || id.includes("google") || id.includes("palm")) return "Google";
  if (id.includes("deepseek")) return "DeepSeek";
  if (id.includes("llama") || id.includes("meta")) return "Meta";
  if (id.includes("mistral") || id.includes("mixtral")) return "Mistral";
  if (id.includes("grok")) return "xAI";
  if (id.includes("flux") || id.includes("stable-diffusion")) return "Image";
  if (id.includes("command") || id.includes("cohere")) return "Cohere";
  return "Other";
}

export function clearModelsCache() {
  modelsCache = null;
}

export interface ChatStreamCallbacks {
  onText: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Chat streaming via backend API
export async function chatStream(
  messages: { role: string; content: string }[],
  model: string,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch("/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      callbacks.onError(new Error(`API error ${response.status}: ${errText.slice(0, 200)}`));
      return;
    }

    // Process SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error("No response body"));
      return;
    }

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        callbacks.onDone(fullText || "[Stopped]");
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);
          if (jsonStr.trim() === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              callbacks.onText(content);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (error: unknown) {
    if (signal?.aborted) return;
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

// Chat non-streaming via backend
export async function chat(
  messages: { role: string; content: string }[],
  model: string
): Promise<string> {
  try {
    const response = await fetch("/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) throw new Error("API request failed");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || data?.message?.content || "";
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to get response");
  }
}



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
    // Fallback to Puter.js client-side if backend not available
    return getModelsFallback();
  }
}

// Fallback: use Puter.js client-side SDK if backend is not configured
async function getModelsFallback(): Promise<ModelInfo[]> {
  try {
    const puter = (await import("@heyputer/puter.js")).default;
    const models = await puter.ai.listModels();
    if (Array.isArray(models)) {
      return models.map((m: Record<string, unknown>) => ({
        id: String(m.id || m.name || ""),
        name: String(m.name || m.id || ""),
        provider: String(m.provider || "unknown"),
        context: m.context ? Number(m.context) : undefined,
        description: m.description ? String(m.description) : undefined,
      }));
    }
    return [];
  } catch {
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

// Chat dengan streaming via backend API kita
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
      // Fallback: coba internal chat endpoint
      const fallbackResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages }),
        signal,
      });

      if (!fallbackResponse.ok) {
        // Last resort: use Puter.js client-side
        await chatStreamFallback(messages, model, callbacks, signal);
        return;
      }

      const data = await fallbackResponse.json();
      const content = data.choices?.[0]?.message?.content || data?.message?.content || "";
      callbacks.onText(content);
      callbacks.onDone(content);
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
    // Fallback on error
    try {
      await chatStreamFallback(messages, model, callbacks, signal);
    } catch {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Fallback: use Puter.js client-side SDK directly
async function chatStreamFallback(
  messages: { role: string; content: string }[],
  model: string,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const puter = (await import("@heyputer/puter.js")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (puter.ai.chat as any)(messages, { model, stream: true });
  let fullText = "";

  for await (const part of response) {
    if (signal?.aborted) {
      callbacks.onDone(fullText || "[Stopped]");
      return;
    }
    if (part?.type === "text" && part?.text) {
      fullText += part.text;
      callbacks.onText(part.text);
    }
  }

  callbacks.onDone(fullText);
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
  } catch {
    // Fallback to Puter.js
    try {
      const puter = (await import("@heyputer/puter.js")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (puter.ai.chat as any)(messages, { model });
      if (typeof response === "object" && response !== null) {
        return String((response as Record<string, unknown>).message || (response as Record<string, unknown>).text || JSON.stringify(response));
      }
      return String(response);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : "Failed to get response");
    }
  }
}

// Generate gambar (tetap pakai Puter.js untuk sekarang)
export async function generateImage(
  prompt: string,
  model?: string
): Promise<string | null> {
  try {
    const puter = (await import("@heyputer/puter.js")).default;
    const options: Record<string, unknown> = {};
    if (model) options.model = model;

    const result = (await puter.ai.txt2img(prompt, options)) as
      | HTMLImageElement
      | string
      | { src: string }
      | null;

    if (!result) return null;
    if (result instanceof HTMLImageElement) return result.src;
    if (typeof result === "string") return result;
    if ("src" in result && typeof (result as { src: string }).src === "string")
      return (result as { src: string }).src;

    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
}

export function isPuterReady(): boolean {
  return true; // Always ready with our backend
}

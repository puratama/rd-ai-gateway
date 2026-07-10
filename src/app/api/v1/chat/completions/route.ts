import { NextRequest } from "next/server";
import { routeRequest } from "@/lib/llm-router";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API Key (server-side)
    const authHeader = request.headers.get("authorization");
    let apiKeyId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { validateServerKey } = await import("@/lib/server-store");
      const apiKey = validateServerKey(token);
      if (apiKey) {
        apiKeyId = apiKey.id;
      }
    }

    // 2. Parse request body
    const body = await request.json();
    const { model, messages, stream = false, temperature, max_tokens } = body;

    if (!messages || !model) {
      return new Response(
        JSON.stringify({ error: "messages and model are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Rate limiting & model access check (only for API key users)
    if (apiKeyId) {
      const { checkRateLimit, checkModelAccess } = await import("@/lib/server-store");
      const limitCheck = checkRateLimit(apiKeyId);
      if (!limitCheck.allowed) {
        return new Response(
          JSON.stringify({
            error: limitCheck.reason || "Rate limit exceeded",
            plan: limitCheck.plan?.name || "Free",
          }),
          { status: 429, headers: { "Content-Type": "application/json", "X-RateLimit-Plan": limitCheck.plan?.name || "Free" } }
        );
      }
      if (!checkModelAccess(apiKeyId, model)) {
        return new Response(
          JSON.stringify({
            error: `Model "${model}" is not included in your plan`,
            upgradeUrl: "/keys",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Track request count for rate limiting
    if (apiKeyId) {
      try {
        const { getSubscriptionByKey, loadSubscriptions, saveSubscriptions } = await import("@/lib/server-store");
        const sub = getSubscriptionByKey(apiKeyId);
        if (sub) {
          const subs = loadSubscriptions();
          const idx = subs.findIndex((s: import("@/lib/server-store").Subscription) => s.id === sub.id);
          if (idx >= 0) {
            subs[idx].requestsToday++;
            saveSubscriptions(subs);
          }
        }
      } catch {}
    }

    // 4. Route request through provider chain with auto-fallback
    const result = await routeRequest({
      model,
      messages,
      stream,
      temperature,
      max_tokens,
    });

    if (!result.success || !result.data) {
      return new Response(
        JSON.stringify({
          error: result.error || "All providers failed",
          attempts: result.attempts,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Track which provider handled the request
    const response = result.data;

    // 4. Handle streaming (SSE)
    if (stream && response.headers.get("content-type")?.includes("text/event-stream")) {
      // Forward the stream directly
      const streamReader = response.body?.getReader();
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          if (!streamReader) {
            controller.close();
            return;
          }

          let fullText = "";
          let streamError = false;

          try {
            // Forward provider prefix in first event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ provider: result.provider })}\n\n`)
            );

            while (true) {
              const { done, value } = await streamReader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

              for (const line of lines) {
                const jsonStr = line.slice(6);
                if (jsonStr.trim() === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) fullText += content;
                } catch {}
                controller.enqueue(encoder.encode(line + "\n\n"));
              }
            }
          } catch {
            streamError = true;
          } finally {
            controller.close();
            streamReader.releaseLock();
          }

          // Track usage after stream completes
          if (apiKeyId && !streamError && fullText) {
            try {
              const { generateId, updateServerKeyUsage, addServerUsageRecord } =
                await import("@/lib/server-store");
              const promptTokens = estimateTokens(JSON.stringify(messages));
              const completionTokens = estimateTokens(fullText);
              updateServerKeyUsage(apiKeyId, promptTokens + completionTokens);
              addServerUsageRecord({
                id: generateId(),
                apiKeyId,
                model,
                provider: result.provider,
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
                timestamp: Date.now(),
                endpoint: "/v1/chat/completions",
              });
            } catch {
              // Non-critical
            }
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Provider": result.provider,
        },
      });
    }

    // 5. Non-streaming: read the response body
    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      data = { choices: [{ message: { content: text } }] };
    }

    // Track usage for non-streaming
    if (apiKeyId) {
      try {
        const { generateId, updateServerKeyUsage, addServerUsageRecord } =
          await import("@/lib/server-store");
        const promptTokens =
          data.usage?.prompt_tokens || estimateTokens(JSON.stringify(messages));
        const completionTokens =
          data.usage?.completion_tokens ||
          estimateTokens(data.choices?.[0]?.message?.content || "");
        updateServerKeyUsage(apiKeyId, promptTokens + completionTokens);
        addServerUsageRecord({
          id: generateId(),
          apiKeyId,
          model,
          provider: result.provider,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          timestamp: Date.now(),
          endpoint: "/v1/chat/completions",
        });
      } catch {
        // Non-critical
      }
    }

    return new Response(JSON.stringify({ ...data, _provider: result.provider }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Simple token estimation (4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 0) / 4);
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

import { NextRequest } from "next/server";
import { routeRequest } from "@/lib/llm-router";

// Derived provider from model ID — must match plan's allowedProviders
function deriveProvider(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes("gpt") || id.includes("o1") || id.includes("o3")) return "openai";
  if (id.includes("claude")) return "anthropic";
  if (id.includes("gemini")) return "google";
  if (id.includes("deepseek")) return "deepseek";
  if (id.includes("llama") || id.includes("meta")) return "meta";
  if (id.includes("mistral") || id.includes("mixtral")) return "mistral";
  return "unknown";
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API Key (server-side)
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");
    let apiKeyId: string | null = null;
    let userId: string | null = null;

    if (authHeader || apiKeyHeader) {
      const token = apiKeyHeader || authHeader!.replace(/^Bearer\s+/i, "").trim();
      const { validateServerKey } = await import("@/lib/server-store");
      const apiKey = await validateServerKey(token);
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: { message: "Invalid or inactive API key", type: "authentication_error", param: null, code: "invalid_api_key" } }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      apiKeyId = apiKey.id;
      userId = apiKey.userId;
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      model, messages, stream = false, temperature, max_tokens, tools, tool_choice,
      response_format, parallel_tool_calls, top_p, stop, seed, user, metadata,
    } = body;

    if (!messages || !model) {
      return new Response(
        JSON.stringify({ error: "messages and model are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Resolve session user, then require an authenticated billing identity.
    if (!apiKeyId) {
      try {
        const { getSession } = await import("@/lib/auth");
        const session = await getSession();
        if (session?.sub) userId = session.sub;
      } catch {
        // Handled by the explicit unauthorized response below.
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only priced AppModels may be used. Unknown aggregator IDs must not become free.
    const { prisma } = await import("@/lib/db");
    const pricedModel = await prisma.appModel.findUnique({
      where: { modelId: String(model) },
      select: {
        modelId: true,
        provider: true,
        isActive: true,
        sellPricePer1kPrompt: true,
        sellPricePer1kCompletion: true,
        tokenPlanPricePer1kPrompt: true,
        tokenPlanPricePer1kCompletion: true,
      },
    });
    if (!pricedModel || !pricedModel.isActive) {
      return new Response(
        JSON.stringify({ error: `Model "${model}" is not configured for billing` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (apiKeyId) {
      const { checkModelAccess } = await import("@/lib/db/quota");
      if (!(await checkModelAccess(apiKeyId, String(model)))) {
        return new Response(
          JSON.stringify({ error: `Model "${model}" is not enabled for this API key or plan` }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
        select: { allModels: true, allowedModels: true },
      });
      const allowedModels = apiKey?.allowedModels ?? [];
      const modelAllowed = apiKey?.allModels !== false || allowedModels.includes(pricedModel.modelId);
      if (!modelAllowed) {
        return new Response(
          JSON.stringify({ error: `Model "${model}" is not enabled for this API key` }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const { rateLimit } = await import("@/lib/rate-limit");
    const requestLimit = rateLimit(request, `api:${apiKeyId || userId}`, { limit: 120, windowMs: 60_000 });
    if (!requestLimit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retry_after: requestLimit.retryAfterSec }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(requestLimit.retryAfterSec) },
      });
    }

    // Estimate prompt tokens for balance check
    const estimatedPromptTokens = estimateTokens(JSON.stringify(messages));

    // Check wallet or token plan
    if (userId) {
      const { holdBalanceOrTokens } = await import("@/lib/db/quota");
      const balanceCheck = await holdBalanceOrTokens(userId, model, estimatedPromptTokens);

      if (!balanceCheck.ok) {
        return new Response(
          JSON.stringify({ error: balanceCheck.reason, upgradeUrl: "/my/wallet" }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }

      // Store tier info for deduction after completion
      (request as unknown as Record<string, unknown>)._billingTier = balanceCheck.tier;
      if (balanceCheck.tier === "package") {
        (request as unknown as Record<string, unknown>)._billingPackageId = balanceCheck.packageId;
        (request as unknown as Record<string, unknown>)._billingHeldTokens = balanceCheck.heldTokens;
      }
      if (balanceCheck.tier === "payg") {
        (request as unknown as Record<string, unknown>)._billingHeldAmount = balanceCheck.heldAmount;
      }
      if (balanceCheck.tier !== "free") {
        (request as unknown as Record<string, unknown>)._billingPricing = balanceCheck.pricing;
      }
    }

    // 4. Route request through provider chain with auto-fallback + retry + load balancing
    const result = await routeRequest({
      model,
      messages,
      stream,
      temperature,
      max_tokens,
      tools,
      tool_choice,
      response_format,
      parallel_tool_calls,
      top_p,
      stop,
      seed,
      user,
      metadata,
      preferProvider: (request as unknown as Record<string, unknown>)._userPlanBackend as string | undefined,
      userId: userId || undefined,
    });

    if (!result.success || !result.data) {
      if (userId) {
        try {
          const { releaseUsageHold } = await import("@/lib/db/quota");
          const billing = request as unknown as Record<string, unknown>;
          const tier = billing._billingTier as "payg" | "package" | undefined;
          if (tier) {
            await releaseUsageHold(userId, {
              tier,
              packageId: billing._billingPackageId as string | undefined,
              pricing: billing._billingPricing as import("@/lib/db/quota").ModelPricing,
              heldTokens: billing._billingHeldTokens as number | undefined,
              heldAmount: billing._billingHeldAmount as number | undefined,
            });
          }
        } catch (error) {
          console.error("[Billing-Hold-Release-Error]:", error);
        }
      }

      return new Response(
        JSON.stringify({
          error: result.error || "All providers failed",
          attempts: result.attempts,
        }),
        {
          status: result.status || 502,
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
          let pending = "";
          let streamError = false;

          try {
            while (true) {
              const { done, value } = await streamReader.read();
              if (done) break;

              pending += new TextDecoder().decode(value);
              const lines = pending.split("\n");
              pending = lines.pop() || "";

              for (const rawLine of lines) {
                const line = rawLine.replace(/\r$/, "");
                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6);
                if (jsonStr.trim() === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }
                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.choices?.[0]?.delta;
                  const content = delta?.content || "";
                  if (content) fullText += typeof content === "string" ? content : JSON.stringify(content);
                  if (delta?.tool_calls) fullText += JSON.stringify(delta.tool_calls);
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

          // Settle or release the hold after the stream completes.
          if (userId) {
            let usageCost = 0;
            try {
              const { settleUsage, releaseUsageHold } = await import("@/lib/db/quota");
              const promptTokens = estimateTokens(JSON.stringify(messages));
              const completionTokens = estimateTokens(fullText);
              const billing = request as unknown as Record<string, unknown>;
              const tier = billing._billingTier as "payg" | "package" | undefined;
              if (tier) {
                const holdInfo = {
                  tier,
                  packageId: billing._billingPackageId as string | undefined,
                  pricing: billing._billingPricing as import("@/lib/db/quota").ModelPricing,
                  heldTokens: billing._billingHeldTokens as number | undefined,
                  heldAmount: billing._billingHeldAmount as number | undefined,
                };
                if (streamError) {
                  await releaseUsageHold(userId, holdInfo);
                } else {
                  usageCost = await settleUsage(userId, model, promptTokens, completionTokens, holdInfo);
                }
              }
            } catch (e: unknown) {
              console.error("[Billing-Stream-Deduction-Error]:", e instanceof Error ? e.message : e);
              // Do not swallow completely: raise console alert.
              // Stream already closed, so post-deduct cannot cancel stream but must be audited.
            }

            // Log usage only for a completed provider response.
            if (!streamError) try {
              const { addServerUsageRecord } = await import("@/lib/server-store");
              await addServerUsageRecord({
                userId,
                apiKeyId: apiKeyId || undefined,
                model,
                provider: result.provider,
                source: apiKeyId ? "api" : "chat",
                promptTokens: estimateTokens(JSON.stringify(messages)),
                completionTokens: estimateTokens(fullText),
                totalTokens: estimateTokens(JSON.stringify(messages)) + estimateTokens(fullText),
                endpoint: "/v1/chat/completions",
                cost: usageCost,
              });
            } catch {/* non-critical */}
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Provider": result.provider,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
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

    // Deduct cost for non-streaming
    let usageCost = 0;
    if (userId) {
      const tier = (request as unknown as Record<string, unknown>)._billingTier as string;
      if (tier && tier !== "free") {
        try {
          const { settleUsage } = await import("@/lib/db/quota");
          const promptTokens =
            data.usage?.prompt_tokens || estimateTokens(JSON.stringify(messages));
          const completionTokens =
            data.usage?.completion_tokens ||
            estimateTokens(data.choices?.[0]?.message?.content || "");

          usageCost = await settleUsage(userId, model, promptTokens, completionTokens, {
            tier: tier as "payg" | "package",
            packageId: (request as unknown as Record<string, unknown>)._billingPackageId as string | undefined,
            pricing: (request as unknown as Record<string, unknown>)._billingPricing as import("@/lib/db/quota").ModelPricing,
            heldTokens: (request as unknown as Record<string, unknown>)._billingHeldTokens as number | undefined,
            heldAmount: (request as unknown as Record<string, unknown>)._billingHeldAmount as number | undefined,
          });
        } catch (e: unknown) {
          console.error("[Billing-Deduction-Error]:", e instanceof Error ? e.message : e);
          // Return failure block since it was non-streaming (can safely return 402/500 before sending content)
          return new Response(
            JSON.stringify({ error: "Failed to finalize billing transaction. Request was aborted." }),
            { status: 402, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // Log usage
      try {
        const { addServerUsageRecord } = await import("@/lib/server-store");
        const promptTokens =
          data.usage?.prompt_tokens || estimateTokens(JSON.stringify(messages));
        const completionTokens =
          data.usage?.completion_tokens ||
          estimateTokens(data.choices?.[0]?.message?.content || "");
        await addServerUsageRecord({
          userId,
          apiKeyId: apiKeyId || undefined,
          model,
          provider: result.provider,
          source: apiKeyId ? "api" : "chat",
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          endpoint: "/v1/chat/completions",
          cost: usageCost,
        });
      } catch {/* non-critical */}
    }

    return new Response(JSON.stringify({ ...data, _provider: result.provider }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      },
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}

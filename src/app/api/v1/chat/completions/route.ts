import { NextRequest } from "next/server";
import { routeRequest } from "@/lib/llm-router";
import { publicCorsHeaders, corsOptions, apiError } from "@/lib/public-api-contract";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API Key (server-side) — /api/v1/* is API-key-only
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");
    let apiKeyId: string | null = null;
    let userId: string | null = null;

    if (!authHeader && !apiKeyHeader) {
      return apiError("Authentication required", 401, "invalid_api_key");
    }

    {
      const token = apiKeyHeader || authHeader!.replace(/^Bearer\s+/i, "").trim();
      const { validateServerKey } = await import("@/lib/server-store");
      const apiKey = await validateServerKey(token);
      if (!apiKey) {
        return apiError("Invalid or inactive API key", 401, "invalid_api_key");
      }
      // Email verification gate — unverified accounts cannot consume the API
      // (same rule as checkRateLimit in src/lib/db/quota.ts).
      if (!apiKey.user.emailVerified) {
        return apiError("Email belum diverifikasi. Cek email Anda.", 403, "email_not_verified", "permission_error");
      }
      apiKeyId = apiKey.id;
      userId = apiKey.userId;
    }

    // Rate limit early — before any heavy DB work (model lookup, quota checks)
    const { rateLimit } = await import("@/lib/rate-limit");
    const requestLimit = rateLimit(request, `api:${apiKeyId || userId}`, { limit: 120, windowMs: 60_000 });
    if (!requestLimit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retry_after: requestLimit.retryAfterSec }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(requestLimit.retryAfterSec), ...publicCorsHeaders },
      });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      model, messages, stream = false, temperature, max_tokens, tools, tool_choice,
      response_format, parallel_tool_calls, top_p, stop, seed, user, metadata,
    } = body;

    if (!messages || !model) {
      return apiError("messages and model are required", 400, "missing_required_parameter");
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
      return apiError(`Model "${model}" is not configured for billing`, 400, "model_not_available");
    }

    if (apiKeyId) {
      const { checkModelAccess } = await import("@/lib/db/quota");
      if (!(await checkModelAccess(apiKeyId, String(model)))) {
        return apiError(`Model "${model}" is not enabled for this API key or plan`, 403, "model_not_allowed", "permission_error");
      }

      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
        select: { allModels: true, allowedModels: true },
      });
      const allowedModels = apiKey?.allowedModels ?? [];
      const modelAllowed = apiKey?.allModels !== false || allowedModels.includes(pricedModel.modelId);
      if (!modelAllowed) {
        return apiError(`Model "${model}" is not enabled for this API key`, 403, "model_not_allowed", "permission_error");
      }
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
          { status: 402, headers: { "Content-Type": "application/json", ...publicCorsHeaders } }
        );
      }

      // Store tier info for deduction after completion
      (request as unknown as Record<string, unknown>)._billingTier = balanceCheck.tier;
      if (balanceCheck.tier === "package" || balanceCheck.tier === "package_payg") {
        (request as unknown as Record<string, unknown>)._billingPackageId = balanceCheck.packageId;
        (request as unknown as Record<string, unknown>)._billingHeldTokens = balanceCheck.heldTokens;
      }
      if (balanceCheck.tier === "payg" || balanceCheck.tier === "package_payg") {
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
          const tier = billing._billingTier as "payg" | "package" | "package_payg" | undefined;
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
          headers: { "Content-Type": "application/json", ...publicCorsHeaders },
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
          // Actual usage reported by the provider (stream_options.include_usage).
          let streamUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null;
          // One decoder for the whole stream — a new TextDecoder() per chunk
          // breaks multibyte characters split across chunk boundaries.
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await streamReader.read();
              if (done) break;

              pending += decoder.decode(value, { stream: true });
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
                  if (parsed.usage) streamUsage = parsed.usage;
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

          // Settle the hold after the stream ends.
          if (userId) {
            let usageCost = 0;
            // Prefer provider-reported usage; fall back to the estimator.
            const promptTokens = streamUsage?.prompt_tokens ?? estimateTokens(JSON.stringify(messages));
            const completionTokens = streamUsage?.completion_tokens ?? estimateTokens(fullText);
            try {
              const { settleUsage } = await import("@/lib/db/quota");
              const billing = request as unknown as Record<string, unknown>;
              const tier = billing._billingTier as "payg" | "package" | "package_payg" | undefined;
              if (tier) {
                const holdInfo = {
                  tier,
                  packageId: billing._billingPackageId as string | undefined,
                  pricing: billing._billingPricing as import("@/lib/db/quota").ModelPricing,
                  heldTokens: billing._billingHeldTokens as number | undefined,
                  heldAmount: billing._billingHeldAmount as number | undefined,
                };
                // Client disconnect / mid-stream error: still settle with the
                // (partial) estimate instead of a full release — a full release
                // leaks revenue for work the provider already did.
                usageCost = await settleUsage(userId, model, promptTokens, completionTokens, holdInfo);
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
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
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
          ...publicCorsHeaders,
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
            tier: tier as "payg" | "package" | "package_payg",
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
            { status: 402, headers: { "Content-Type": "application/json", ...publicCorsHeaders } }
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
        ...publicCorsHeaders,
      },
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...publicCorsHeaders } }
    );
  }
}

// Simple token estimation (4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 0) / 4);
}

export function OPTIONS() {
  return corsOptions();
}

import { NextRequest } from "next/server";
import { routeRequest } from "@/lib/llm-router";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API Key (server-side)
    const authHeader = request.headers.get("authorization");
    let apiKeyId: string | null = null;
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { validateServerKey } = await import("@/lib/server-store");
      const apiKey = await validateServerKey(token);
      if (apiKey) {
        apiKeyId = apiKey.id;
        userId = apiKey.userId;
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
      const limitCheck = await checkRateLimit(apiKeyId);
      if (!limitCheck.allowed) {
        return new Response(
          JSON.stringify({
            error: limitCheck.reason || "Rate limit exceeded",
            plan: limitCheck.plan?.name || "Free",
          }),
          { status: 429, headers: { "Content-Type": "application/json", "X-RateLimit-Plan": limitCheck.plan?.name || "Free" } }
        );
      }
      if (!await checkModelAccess(apiKeyId, model)) {
        return new Response(
          JSON.stringify({
            error: `Model "${model}" is not included in your plan`,
            upgradeUrl: "/keys",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check active package quota
      const { prisma } = await import("@/lib/db");
      const activePackage = await prisma.userPackage.findFirst({
        where: {
          userId: userId!,
          status: "active",
          expiresAt: { gt: new Date() },
          tokensRemaining: { gt: 0 },
        },
        orderBy: { expiresAt: "asc" },
      });
      if (activePackage) {
        // Store for deduction after completion
        (request as unknown as Record<string, unknown>)._quotaPackageId = activePackage.id;
        const pkgPlan = await prisma.plan.findUnique({ where: { id: activePackage.planId }, select: { backend: true } }).catch(() => null);
        (request as unknown as Record<string, unknown>)._userPlanBackend = pkgPlan?.backend || "aggregator";
      } else {
        // No active package — check for active subscription
        const activeSub = await prisma.subscription.findFirst({
          where: {
            userId: userId!,
            status: "active",
            endDate: { gt: new Date() },
          },
          select: { id: true, plan: { select: { backend: true } } },
        });
        if (activeSub) {
          (request as unknown as Record<string, unknown>)._quotaSubscriptionId = activeSub.id;
          (request as unknown as Record<string, unknown>)._userPlanBackend = activeSub.plan?.backend || "puter";
        } else {
          // Free tier — use Puter
          (request as unknown as Record<string, unknown>)._userPlanBackend = "puter";
        }
      }
    }

    // 4. Route request through provider chain with auto-fallback + retry + load balancing
    const result = await routeRequest({
      model,
      messages,
      stream,
      temperature,
      max_tokens,
      preferProvider: (request as unknown as Record<string, unknown>)._userPlanBackend as string | undefined,
      userId: userId || undefined,
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
              const { updateServerKeyUsage, addServerUsageRecord } =
                await import("@/lib/server-store");
              const promptTokens = estimateTokens(JSON.stringify(messages));
              const completionTokens = estimateTokens(fullText);
              await updateServerKeyUsage(apiKeyId, promptTokens + completionTokens);
              await addServerUsageRecord({
                userId: userId ?? apiKeyId,
                model,
                provider: result.provider,
                source: "api",
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
                endpoint: "/v1/chat/completions",
              });
              // Deduct from package quota if active
              const pkgId = (request as unknown as Record<string, unknown>)._quotaPackageId;
              if (typeof pkgId === "string") {
                const { prisma } = await import("@/lib/db");
                const updatedPackage = await prisma.userPackage.update({
                  where: { id: pkgId },
                  data: {
                    tokensRemaining: { decrement: promptTokens + completionTokens },
                  },
                }).catch(() => null);

                if (
                  userId &&
                  updatedPackage &&
                  updatedPackage.tokensTotal > 0 &&
                  updatedPackage.tokensRemaining < updatedPackage.tokensTotal * 0.2
                ) {
                  const percent = Math.round(
                    ((updatedPackage.tokensTotal - updatedPackage.tokensRemaining) /
                      updatedPackage.tokensTotal) *
                      100
                  );
                  void import("@/lib/notifications")
                    .then(({ notifyUsageAlert }) => notifyUsageAlert(userId, percent))
                    .catch(() => {});
                }
              }

              // Increment subscription tokensUsed if active
              const subId = (request as unknown as Record<string, unknown>)._quotaSubscriptionId;
              if (typeof subId === "string") {
                const { prisma } = await import("@/lib/db");
                await prisma.subscription.update({
                  where: { id: subId },
                  data: {
                    tokensUsed: { increment: promptTokens + completionTokens },
                  },
                }).catch(() => null);
              }
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
        const { updateServerKeyUsage, addServerUsageRecord } =
          await import("@/lib/server-store");
        const promptTokens =
          data.usage?.prompt_tokens || estimateTokens(JSON.stringify(messages));
        const completionTokens =
          data.usage?.completion_tokens ||
          estimateTokens(data.choices?.[0]?.message?.content || "");
        await updateServerKeyUsage(apiKeyId, promptTokens + completionTokens);
        await addServerUsageRecord({
          userId: userId ?? apiKeyId,
          model,
          provider: result.provider,
          source: "api",
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          endpoint: "/v1/chat/completions",
        });
        // Deduct from package quota if active
        const pkgId = (request as unknown as Record<string, unknown>)._quotaPackageId;
        if (typeof pkgId === "string") {
          const { prisma } = await import("@/lib/db");
          const updatedPackage = await prisma.userPackage.update({
            where: { id: pkgId },
            data: {
              tokensRemaining: { decrement: promptTokens + completionTokens },
            },
          }).catch(() => null);

          if (
            userId &&
            updatedPackage &&
            updatedPackage.tokensTotal > 0 &&
            updatedPackage.tokensRemaining < updatedPackage.tokensTotal * 0.2
          ) {
            const percent = Math.round(
              ((updatedPackage.tokensTotal - updatedPackage.tokensRemaining) / updatedPackage.tokensTotal) * 100
            );
            void import("@/lib/notifications")
              .then(({ notifyUsageAlert }) => notifyUsageAlert(userId, percent))
              .catch(() => {});
          }
        }

        // Increment subscription tokensUsed if active
        const subId = (request as unknown as Record<string, unknown>)._quotaSubscriptionId;
        if (typeof subId === "string") {
          const { prisma } = await import("@/lib/db");
          await prisma.subscription.update({
            where: { id: subId },
            data: {
              tokensUsed: { increment: promptTokens + completionTokens },
            },
          }).catch(() => null);
        }
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

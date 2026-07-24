import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface AggregatorModel {
  id: string;
  name?: string;
  provider?: string;
  context?: number;
}

/**
 * GET /api/admin/aggregators/models?id=<aggregator_id>
 * Fetch available models from an aggregator's API.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const agg = await prisma.aggregatorConfig.findUnique({ where: { id } });
    if (!agg) {
      return NextResponse.json({ error: "Aggregator not found" }, { status: 404 });
    }

    if (!agg.isActive) {
      return NextResponse.json({ error: "Aggregator is not active" }, { status: 400 });
    }

    const apiKey = agg.apiKeyEnc;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured for this aggregator" }, { status: 500 });
    }

    // Fetch models from aggregator (OpenAI-compatible /models endpoint)
    const modelsRes = await fetch(`${agg.baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!modelsRes.ok) {
      const errorBody = await modelsRes.text().catch(() => "");
      return NextResponse.json({
        error: `Aggregator returned ${modelsRes.status}: ${errorBody.slice(0, 200) || modelsRes.statusText}`,
      }, { status: 502 });
    }

    const data = await modelsRes.json().catch(() => ({}));

    // Handle both OpenAI-compatible format ({data: [...]}) and flat array format
    const rawModels: unknown[] = Array.isArray(data) ? data : (data?.data ?? data?.models ?? []);

    // Normalize into consistent shape
    const models: AggregatorModel[] = rawModels.map((m: unknown) => {
      const model = m as Record<string, unknown>;
      return {
        id: String(model.id || model.name || ""),
        name: String(model.name || model.id || ""),
        provider: String(model.owned_by || model.provider || agg.name),
        context: typeof model.context_length === "number" ? model.context_length : undefined,
      };
    }).filter((m) => m.id);

    // Cross-reference with existing AppModels to flag which are already configured
    const existingModels = await prisma.appModel.findMany({
      where: { source: "aggregator" },
      select: { modelId: true },
    });
    const existingIds = new Set(existingModels.map((m) => m.modelId));

    return NextResponse.json({
      aggregator: agg.name,
      models: models.map((m) => ({
        ...m,
        alreadyConfigured: existingIds.has(m.id),
      })),
      total: models.length,
      alreadyConfigured: models.filter((m) => existingIds.has(m.id)).length,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Connection to aggregator timed out (15s)" }, { status: 504 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

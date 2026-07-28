import { NextRequest, NextResponse } from "next/server";
import { getAllPricedModels, bulkUpdateMarkup } from "@/lib/pricing-engine";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const models = await getAllPricedModels();
    const providers = await prisma.appModel.groupBy({ by: ["provider"], _count: true });
    return NextResponse.json({ models, providers: providers.map((p) => p.provider) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "bulk-markup") {
      const { markupPercent, filter } = body;
      if (typeof markupPercent !== "number" || markupPercent < 0) {
        return NextResponse.json({ error: "markupPercent must be a non-negative number" }, { status: 400 });
      }
      const count = await bulkUpdateMarkup(markupPercent, filter);
      return NextResponse.json({ updated: count });
    }

    if (action === "update-model") {
      const { id, markupPercent, costPer1kPrompt, costPer1kCompletion, tokenPlanPricePer1kPrompt, tokenPlanPricePer1kCompletion } = body;
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

      const m = await prisma.appModel.findUnique({ where: { id } });
      if (!m) return NextResponse.json({ error: "Model not found" }, { status: 404 });

      const { calcSellPrice } = await import("@/lib/pricing-engine");

      const newMarkup = typeof markupPercent === "number" && markupPercent >= 0 && markupPercent <= 500
        ? markupPercent
        : Number(m.markupPercent || 0);
      const newCostP = typeof costPer1kPrompt === "number" && costPer1kPrompt >= 0
        ? costPer1kPrompt
        : Number(m.costPer1kPrompt || 0);
      const newCostC = typeof costPer1kCompletion === "number" && costPer1kCompletion >= 0
        ? costPer1kCompletion
        : Number(m.costPer1kCompletion || 0);
      const newTPP = typeof tokenPlanPricePer1kPrompt === "number" && tokenPlanPricePer1kPrompt >= 0
        ? tokenPlanPricePer1kPrompt
        : undefined;
      const newTPC = typeof tokenPlanPricePer1kCompletion === "number" && tokenPlanPricePer1kCompletion >= 0
        ? tokenPlanPricePer1kCompletion
        : undefined;

      const updateData: Record<string, unknown> = {
        markupPercent: newMarkup,
        costPer1kPrompt: newCostP,
        costPer1kCompletion: newCostC,
        sellPricePer1kPrompt: calcSellPrice(newCostP, newMarkup),
        sellPricePer1kCompletion: calcSellPrice(newCostC, newMarkup),
      };
      if (newTPP !== undefined) updateData.tokenPlanPricePer1kPrompt = newTPP;
      if (newTPC !== undefined) updateData.tokenPlanPricePer1kCompletion = newTPC;

      await prisma.appModel.update({ where: { id }, data: updateData });
      return NextResponse.json({ updated: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

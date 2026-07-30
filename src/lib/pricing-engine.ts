import { prisma } from "@/lib/db";

export interface PricedModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  contextWindow: number;
  costPer1kPrompt: number;
  costPer1kCompletion: number;
  markupPercent: number;
  sellPricePer1kPrompt: number;
  sellPricePer1kCompletion: number;
  marginPercentPrompt: number;
  marginPercentCompletion: number;
  tokenPlanPricePer1kPrompt: number;
  tokenPlanPricePer1kCompletion: number;
  isActive: boolean;
}

/** Calculate selling price: cost × (1 + markup/100). Rounds up to nearest rupiah. */
export function calcSellPrice(cost: number, markupPercent: number): number {
  if (cost <= 0) return 0;
  return Math.ceil(cost * (1 + markupPercent / 100));
}

/** Calculate margin: (sell - cost) / sell × 100 */
export function calcMargin(cost: number, sell: number): number {
  if (sell <= 0) return 0;
  return Math.round(((sell - cost) / sell) * 100 * 100) / 100;
}

/** Get all models with computed pricing. */
export async function getAllPricedModels(): Promise<PricedModel[]> {
  const models = await prisma.appModel.findMany({ orderBy: [{ provider: "asc" }, { name: "asc" }] });
  return models.map((m) => {
    const costP = Number(m.costPer1kPrompt || 0);
    const costC = Number(m.costPer1kCompletion || 0);
    const markup = Number(m.markupPercent || 0);
    const sellP = m.sellPricePer1kPrompt !== null ? Number(m.sellPricePer1kPrompt) : calcSellPrice(costP, markup);
    const sellC = m.sellPricePer1kCompletion !== null ? Number(m.sellPricePer1kCompletion) : calcSellPrice(costC, markup);
    return {
      id: m.id,
      modelId: m.modelId,
      name: m.name,
      provider: m.provider,
      contextWindow: m.contextWindow,
      costPer1kPrompt: costP,
      costPer1kCompletion: costC,
      markupPercent: markup,
      sellPricePer1kPrompt: sellP,
      sellPricePer1kCompletion: sellC,
      marginPercentPrompt: calcMargin(costP, sellP),
      marginPercentCompletion: calcMargin(costC, sellC),
      tokenPlanPricePer1kPrompt: Number(m.tokenPlanPricePer1kPrompt || 0),
      tokenPlanPricePer1kCompletion: Number(m.tokenPlanPricePer1kCompletion || 0),
      isActive: m.isActive,
    };
  });
}

/** Bulk set markup for filtered models. Returns count updated. */
export async function bulkUpdateMarkup(markupPercent: number, filter?: { provider?: string }): Promise<number> {
  const where: Record<string, unknown> = {};
  if (filter?.provider) where.provider = filter.provider;

  const models = await prisma.appModel.findMany({ where });
  if (!models.length) return 0;

  // Recalculate sell prices
  const updates = models.map((m) => {
    const costP = Number(m.costPer1kPrompt || 0);
    const costC = Number(m.costPer1kCompletion || 0);
    return {
      id: m.id,
      sellPricePer1kPrompt: calcSellPrice(costP, markupPercent),
      sellPricePer1kCompletion: calcSellPrice(costC, markupPercent),
      markupPercent,
    };
  });

  // Batch update
  let count = 0;
  for (const u of updates) {
    await prisma.appModel.update({ where: { id: u.id }, data: u });
    count++;
  }
  return count;
}

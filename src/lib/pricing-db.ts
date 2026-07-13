import { type ModelPricing } from "@/types";

interface AdminModelRaw {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  source: string;
  category: string;
  contextWindow: number;
  costPer1kPrompt: number | null;
  costPer1kCompletion: number | null;
  markupPercent: number;
  sellPricePer1kPrompt: number | null;
  sellPricePer1kCompletion: number | null;
  isActive: boolean;
}

const SPEED_MAP: Record<string, ModelPricing["speed"]> = {
  fast: "fast",
  coding: "balanced",
  chat: "balanced",
  reasoning: "slow",
  image: "balanced",
  vision: "balanced",
  "open-source": "fast",
};

function inferSpeed(model: AdminModelRaw): ModelPricing["speed"] {
  const id = model.modelId.toLowerCase();
  if (id.includes("mini") || id.includes("flash") || id.includes("haiku")) return "fast";
  if (id.includes("opus") || id.includes("reasoner") || id.includes("r1")) return "slow";
  return SPEED_MAP[model.category] ?? "balanced";
}

function inferQuality(model: AdminModelRaw): string {
  const id = model.modelId.toLowerCase();
  if (id.includes("opus") || id.includes("gpt-4o") || id.includes("sonnet-4") || id.includes("pro")) return "Excellent";
  if (id.includes("mini") || id.includes("flash") || id.includes("haiku") || id.includes("3.5-turbo")) return "Good";
  if (id.includes("gpt-5") || id.includes("o3")) return "Best";
  return "Good";
}

const CATEGORY_MAP: Record<string, ModelPricing["category"]> = {
  chat: "chat",
  reasoning: "reasoning",
  coding: "coding",
  fast: "fast",
  image: "image",
  vision: "vision",
  "open-source": "open-source",
};

export function dbModelToPricing(m: AdminModelRaw): ModelPricing {
  return {
    id: m.modelId,
    name: m.name,
    provider: m.provider,
    category: CATEGORY_MAP[m.category] ?? "chat",
    context: m.contextWindow,
    pricing: {
      prompt: m.sellPricePer1kPrompt ?? m.costPer1kPrompt ?? 0,
      completion: m.sellPricePer1kCompletion ?? m.costPer1kCompletion ?? 0,
    },
    speed: inferSpeed(m),
    quality: inferQuality(m),
    available: m.isActive,
  };
}

export async function fetchPricingFromDB(): Promise<ModelPricing[]> {
  const res = await fetch("/api/admin/models", { credentials: "include" });
  if (!res.ok) return [];
  const data: AdminModelRaw[] = await res.json();
  return data.filter((m) => m.isActive).map(dbModelToPricing);
}

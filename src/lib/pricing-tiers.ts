export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

interface PlanRaw {
  id: string;
  name: string;
  description?: string;
  price: number;
  features: Record<string, unknown>;
  isActive: boolean;
}

export function planToTier(p: PlanRaw): PricingTier {
  const f = p.features;
  const feats: string[] = [];
  if (f.maxTokensPerMonth) feats.push(`${Number(f.maxTokensPerMonth).toLocaleString("id-ID")} token`);
  if (f.streaming) feats.push("Streaming");
  if (f.imageGeneration) feats.push("Image generation");
  if (f.allowedModels && Array.isArray(f.allowedModels) && f.allowedModels.length > 0) feats.push(`${f.allowedModels.length} model`);
  else feats.push("Semua model");

  return {
    name: p.name,
    price: p.price === 0 ? "Gratis" : `Rp ${Number(p.price).toLocaleString("id-ID")}`,
    description: p.description || p.name,
    features: feats,
    cta: p.price === 0 ? "Mulai" : "Beli Paket",
    // heuristik: plan bernama "...pro..." dianggap paket unggulan
    popular: p.name.toLowerCase().includes("pro"),
  };
}

export function formatPrice(n: number): string {
  return n === 0 ? "Gratis" : n % 1 === 0 ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

export function priceLabel(n: number | null): string {
  if (n == null) return "—";
  return n === 0 ? "Gratis" : `Rp ${formatPrice(n)}`;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

export const FALLBACK_TIERS: PricingTier[] = [
  { name: "Starter", price: "Gratis", description: "Untuk mencoba platform", features: ["1.000 token/hari", "Model dasar", "Community support"], cta: "Mulai", popular: false },
  { name: "Pro", price: "Rp 99K", description: "Untuk developer serius", features: ["1 juta token / 30 hari", "Semua model", "Streaming & analytics"], cta: "Beli Paket", popular: true },
  { name: "Enterprise", price: "Custom", description: "Untuk tim dan bisnis", features: ["Volume besar", "Dukungan khusus", "SLA"], cta: "Hubungi Kami", popular: false },
];

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

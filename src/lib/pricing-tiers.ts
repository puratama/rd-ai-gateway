export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  billingPeriod: string;
  cta: string;
  popular: boolean;
}

interface PlanRaw {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  billingPeriod: string;
  features: Record<string, unknown>;
  isActive: boolean;
}

const billingLabel = (period: string) => {
  switch (period) {
    case "daily":
      return "1 hari";
    case "weekly":
      return "1 minggu";
    case "yearly":
      return "1 tahun";
    default:
      return "1 bulan";
  }
};

export function planToTier(p: PlanRaw): PricingTier {
  const highlights = Array.isArray(p.features?.highlights)
    ? (p.features.highlights as string[])
    : [];

  return {
    name: p.name,
    price: p.price === 0 ? "Gratis" : `Rp ${Number(p.price).toLocaleString("id-ID")}`,
    description: p.description || "",
    features: highlights,
    billingPeriod: `Berlaku ${billingLabel(p.billingPeriod)}`,
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

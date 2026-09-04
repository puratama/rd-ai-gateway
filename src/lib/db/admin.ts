import { prisma } from "../db";
import { loadPlans } from "./plans";

// ====== Aggregator Config ======

export async function getAggregatorConfig() {
  return prisma.aggregatorConfig.findFirst({ where: { isActive: true } });
}

export async function updateAggregatorConfig(data: Record<string, unknown>) {
  const existing = await prisma.aggregatorConfig.findFirst({ where: { isActive: true } });
  if (existing) {
    return prisma.aggregatorConfig.update({ where: { id: existing.id }, data });
  }
  return prisma.aggregatorConfig.create({ data: data as Parameters<typeof prisma.aggregatorConfig.create>[0]["data"] });
}

/**
 * Persist urutan aggregator sesuai array id yang diberikan (indeks = sortOrder baru).
 * Menggunakan transaksi agar urutan atomik.
 */
export async function reorderAggregators(ids: string[]): Promise<boolean> {
  if (!Array.isArray(ids) || ids.length === 0) return false;
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.aggregatorConfig.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
  return true;
}

// ====== Admin Stats ======

export async function getAdminStats() {
  const keys = await prisma.apiKey.findMany();
  const records = await prisma.usageRecord.findMany();
  const packages = await prisma.userPackage.findMany();
  const plans = await loadPlans();
  const billing = await prisma.billingRecord.findMany();

  const activeKeys = keys.filter((k) => k.isActive);
  const usedKeys = activeKeys.filter((k) => k.usageCount > 0);

  const completedPayments = billing.filter((b) => b.status === "paid");
  const totalRevenue = completedPayments.reduce((sum, b) => sum + Number(b.amount), 0);
  const pendingRevenue = billing
    .filter((b) => b.status === "pending")
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.createdAt.toISOString().slice(0, 10) === today);
  const todayTokens = todayRecords.reduce((sum, r) => sum + r.totalTokens, 0);

  const providerUsage: Record<string, number> = {};
  records.forEach((r) => {
    if (r.provider) {
      providerUsage[r.provider] = (providerUsage[r.provider] || 0) + r.totalTokens;
    }
  });

  const dailyUsage: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dailyUsage[d] = 0;
  }
  records.forEach((r) => {
    const d = r.createdAt.toISOString().slice(0, 10);
    if (dailyUsage[d] !== undefined) {
      dailyUsage[d] += r.totalTokens;
    }
  });

  const activePkgs = packages.filter((p) => p.status === "active");
  const pkgsByPlan: Record<string, number> = {};
  activePkgs.forEach((p) => {
    pkgsByPlan[p.planId] = (pkgsByPlan[p.planId] || 0) + 1;
  });

  return {
    overview: {
      totalKeys: keys.length,
      activeKeys: activeKeys.length,
      usedKeys: usedKeys.length,
      totalRequests: records.length,
      totalTokens,
      todayTokens,
      todayRequests: todayRecords.length,
    },
    revenue: {
      totalRevenue,
      pendingRevenue,
      completedPayments: completedPayments.length,
      pendingPayments: billing.filter((b) => b.status === "pending").length,
      totalBillingRecords: billing.length,
    },
    packages: {
      total: packages.length,
      active: activePkgs.length,
      byPlan: pkgsByPlan,
    },
    providers: providerUsage,
    dailyUsage,
    plans,
  };
}

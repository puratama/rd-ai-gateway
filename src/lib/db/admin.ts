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

// ====== Puter Limits ======

export async function getPuterLimits() {
  return prisma.puterLimit.findFirst({ orderBy: { updatedAt: "desc" } });
}

export async function updatePuterLimits(data: Record<string, unknown>) {
  const existing = await prisma.puterLimit.findFirst();
  if (existing) {
    return prisma.puterLimit.update({ where: { id: existing.id }, data });
  }
  return prisma.puterLimit.create({ data: data as Parameters<typeof prisma.puterLimit.create>[0]["data"] });
}

// ====== Admin Stats ======

export async function getAdminStats() {
  const keys = await prisma.apiKey.findMany();
  const records = await prisma.usageRecord.findMany();
  const subs = await prisma.subscription.findMany();
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

  const activeSubs = subs.filter((s) => s.status === "active");
  const subsByPlan: Record<string, number> = {};
  activeSubs.forEach((s) => {
    subsByPlan[s.planId] = (subsByPlan[s.planId] || 0) + 1;
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
    subscriptions: {
      total: subs.length,
      active: activeSubs.length,
      byPlan: subsByPlan,
    },
    providers: providerUsage,
    dailyUsage,
    plans,
  };
}

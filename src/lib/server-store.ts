import { prisma } from "./db";

export type BillingPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  backend: string;
  billingPeriod: string;
  price: number;
  features: {
    maxRequestsPerDay: number;
    maxTokensPerMonth: number;
    allowedModels: string[];
    allowedProviders: string[];
    streaming: boolean;
    imageGeneration: boolean;
    apiAccess: boolean;
    priority: "low" | "normal" | "high";
  };
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  tokensUsed: number;
  startDate: number;
  endDate: number;
  autoRenew: boolean;
  createdAt: number;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ====== API Keys ======

export async function loadServerKeys() {
  return prisma.apiKey.findMany({ include: { user: true } });
}

export async function validateServerKey(key: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key, isActive: true },
    include: { user: { include: { wallet: true } } },
  });
  return apiKey;
}

export async function createServerKey(name: string, email?: string) {
  const user = await prisma.user.create({
    data: {
      email: email || `${name}-${Date.now()}@generated.local`,
      passwordHash: "generated",
      name,
      puterStatus: "pending",
      wallet: { create: { balance: 0 } },
      apiKey: {
        create: {
          key: `xpgw_${generateId()}${generateId().slice(0, 16)}`,
          name,
        },
      },
    },
    include: { apiKey: true, wallet: true },
  });
  return user.apiKey!;
}

export async function revokeServerKey(id: string) {
  try {
    await prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteServerKey(id: string) {
  try {
    await prisma.apiKey.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function updateServerKeyUsage(keyId: string, tokens: number) {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      usageCount: { increment: 1 },
      totalTokens: { increment: tokens },
      lastUsed: new Date(),
    },
  });
}

// ====== Usage Records ======

export async function loadServerUsageRecords() {
  return prisma.usageRecord.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
}

export async function addServerUsageRecord(record: {
  userId: string;
  model: string;
  provider?: string;
  source: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  endpoint: string;
}) {
  return prisma.usageRecord.create({ data: record });
}

export async function getServerUsageSummary(userId: string) {
  const records = await prisma.usageRecord.findMany({ where: { userId } });
  const modelBreakdown: Record<string, number> = {};
  const dailyUsage: Record<string, number> = {};
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const record of records) {
    modelBreakdown[record.model] = (modelBreakdown[record.model] || 0) + record.totalTokens;
    const date = record.createdAt.toISOString().slice(0, 10);
    dailyUsage[date] = (dailyUsage[date] || 0) + record.totalTokens;
    totalPromptTokens += record.promptTokens;
    totalCompletionTokens += record.completionTokens;
  }

  return {
    totalRequests: records.length,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    totalPromptTokens,
    totalCompletionTokens,
    modelBreakdown,
    dailyUsage,
    userId,
  };
}

// ====== Plans ======

function mapPlan(p: {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  backend: string;
  billingPeriod: string;
  price: unknown;
  maxTokensPerPeriod: number;
  maxRequestsPerDay: number;
  allowedModels: string[];
  allowedProviders: string[];
  streaming: boolean;
  imageGeneration: boolean;
  apiAccess: boolean;
  priority: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): MembershipPlan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    type: p.type,
    backend: p.backend,
    billingPeriod: p.billingPeriod,
    price: Number(p.price),
    features: {
      maxRequestsPerDay: p.maxRequestsPerDay,
      maxTokensPerMonth: p.maxTokensPerPeriod,
      allowedModels: p.allowedModels,
      allowedProviders: p.allowedProviders,
      streaming: p.streaming,
      imageGeneration: p.imageGeneration,
      apiAccess: p.apiAccess,
      priority: p.priority as "low" | "normal" | "high",
    },
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.getTime(),
    updatedAt: p.updatedAt.getTime(),
  };
}

export async function loadPlans(): Promise<MembershipPlan[]> {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return plans.map(mapPlan);
}

export async function getPlan(id: string): Promise<MembershipPlan | null> {
  const p = await prisma.plan.findUnique({ where: { id } });
  return p ? mapPlan(p) : null;
}

export async function createPlan(data: {
  name: string;
  description?: string;
  type: string;
  backend: string;
  billingPeriod: string;
  price: number;
  maxTokensPerPeriod: number;
  maxRequestsPerDay: number;
  allowedModels?: string[];
  allowedProviders?: string[];
  streaming?: boolean;
  imageGeneration?: boolean;
  apiAccess?: boolean;
  priority?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  return prisma.plan.create({ data });
}

export async function updatePlan(id: string, data: Record<string, unknown>) {
  try {
    return await prisma.plan.update({ where: { id }, data });
  } catch {
    return null;
  }
}

export async function deletePlan(id: string) {
  try {
    await prisma.plan.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ====== Subscriptions ======

export async function getSubscriptionsByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: "active", endDate: { gt: new Date() } },
    include: { plan: true },
  });
}

export async function createSubscription(userId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const endDate = new Date();
  switch (plan.billingPeriod) {
    case "daily": endDate.setDate(endDate.getDate() + 1); break;
    case "weekly": endDate.setDate(endDate.getDate() + 7); break;
    case "monthly": endDate.setMonth(endDate.getMonth() + 1); break;
    case "yearly": endDate.setFullYear(endDate.getFullYear() + 1); break;
  }

  return prisma.subscription.create({
    data: { userId, planId, endDate },
    include: { plan: true },
  });
}

// ====== User Packages ======

export async function getActivePackages(userId: string) {
  return prisma.userPackage.findMany({
    where: { userId, status: "active", expiresAt: { gt: new Date() }, tokensRemaining: { gt: 0 } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUserPackage(userId: string, planId: string, billingId?: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const expiresAt = new Date();
  switch (plan.billingPeriod) {
    case "daily": expiresAt.setDate(expiresAt.getDate() + 1); break;
    case "weekly": expiresAt.setDate(expiresAt.getDate() + 7); break;
    case "monthly": expiresAt.setMonth(expiresAt.getMonth() + 1); break;
  }

  return prisma.userPackage.create({
    data: {
      userId,
      planId,
      tokensRemaining: plan.maxTokensPerPeriod,
      tokensTotal: plan.maxTokensPerPeriod,
      expiresAt,
      billingId,
    },
    include: { plan: true },
  });
}

export async function decrementPackageTokens(packageId: string, tokens: number) {
  return prisma.userPackage.update({
    where: { id: packageId },
    data: { tokensRemaining: { decrement: tokens } },
  });
}

// ====== Wallet ======

export async function getWallet(userId: string) {
  return prisma.wallet.findUnique({ where: { userId } });
}

export async function topupWallet(userId: string, amount: number) {
  return prisma.wallet.update({
    where: { userId },
    data: { balance: { increment: amount } },
  });
}

export async function deductWallet(userId: string, amount: number) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || Number(wallet.balance) < amount) return null;
  return prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });
}

// ====== Billing ======

export async function createBillingRecord(data: {
  userId: string;
  type: string;
  amount: number;
  status?: string;
  midtransOrderId?: string;
  planId?: string;
  description?: string;
}) {
  return prisma.billingRecord.create({ data: { ...data, status: data.status || "pending" } });
}

export async function updateBillingStatus(orderId: string, status: string) {
  return prisma.billingRecord.update({
    where: { midtransOrderId: orderId },
    data: { status, paidAt: status === "paid" ? new Date() : undefined },
  });
}

export async function getBillingByOrderId(orderId: string) {
  return prisma.billingRecord.findUnique({ where: { midtransOrderId: orderId } });
}

export const getBillingRecord = getBillingByOrderId;

// ====== Subscriptions (backward-compat wrappers) ======

export async function getSubscriptionByKey(apiKeyId: string) {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return null;
  return prisma.subscription.findFirst({
    where: { userId: apiKey.userId, status: "active", endDate: { gt: new Date() } },
    include: { plan: true },
  });
}

export async function loadSubscriptions() {
  return prisma.subscription.findMany({ include: { plan: true } });
}

export async function cancelSubscription(id: string) {
  try {
    await prisma.subscription.update({ where: { id }, data: { status: "cancelled" } });
    return true;
  } catch { return false; }
}

export async function extendSubscription(userId: string, planId: string, period: BillingPeriod) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, planId, status: "active" },
    include: { plan: true },
  });
  if (!sub) return false;
  const endDate = new Date(sub.endDate);
  switch (period) {
    case "daily": endDate.setDate(endDate.getDate() + 1); break;
    case "weekly": endDate.setDate(endDate.getDate() + 7); break;
    case "monthly": endDate.setMonth(endDate.getMonth() + 1); break;
    case "yearly": endDate.setFullYear(endDate.getFullYear() + 1); break;
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { endDate } });
  return true;
}

// ====== Rate Limit & Model Access ======

export async function checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; reason?: string; plan?: MembershipPlan }> {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return { allowed: false, reason: "API key not found" };

  const sub = await prisma.subscription.findFirst({
    where: { userId: apiKey.userId, status: "active", endDate: { gt: new Date() } },
    include: { plan: true },
  });

  if (!sub) {
    // No subscription → use free plan limits
    const freePlan = await getPlan("free");
    return { allowed: true, plan: freePlan ?? undefined };
  }

  const plan = await getPlan(sub.planId);
  if (!plan) return { allowed: false, reason: "Plan not found" };

  // Check daily request limit via usage records
  const today = new Date(); today.setHours(0,0,0,0);
  const todayCount = await prisma.usageRecord.count({
    where: { userId: apiKey.userId, createdAt: { gte: today } },
  });

  if (todayCount >= plan.features.maxRequestsPerDay) {
    return { allowed: false, reason: `Daily limit reached (${plan.features.maxRequestsPerDay})`, plan };
  }

  return { allowed: true, plan };
}

export async function checkModelAccess(apiKeyId: string, modelId: string): Promise<boolean> {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return false;

  const sub = await prisma.subscription.findFirst({
    where: { userId: apiKey.userId, status: "active", endDate: { gt: new Date() } },
    include: { plan: true },
  });

  if (!sub) {
    const freePlan = await getPlan("free");
    if (!freePlan) return true;
    return freePlan.features.allowedModels.length === 0 || freePlan.features.allowedModels.includes(modelId);
  }

  const plan = await getPlan(sub.planId);
  if (!plan) return false;
  if (plan.features.allowedModels.length === 0) return true;
  return plan.features.allowedModels.includes(modelId);
}

// ====== App Models ======

export async function loadAppModels() {
  return prisma.appModel.findMany({ orderBy: [{ provider: "asc" }, { name: "asc" }] });
}

export async function updateAppModel(id: string, data: Record<string, unknown>) {
  return prisma.appModel.update({ where: { id }, data });
}

export async function upsertAppModel(modelId: string, data: Record<string, unknown>) {
  return prisma.appModel.upsert({
    where: { modelId },
    create: data as Parameters<typeof prisma.appModel.upsert>[0]["create"],
    update: data,
  });
}

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
  const plans = await prisma.plan.findMany();
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
    plans: plans.map(mapPlan),
  };
}

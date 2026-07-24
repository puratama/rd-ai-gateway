import { prisma } from "../db";
import { getPlan } from "./plans";
import type { MembershipPlan } from "./plans";

// ====== Rate Limit ======

export async function checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; reason?: string; plan?: MembershipPlan }> {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return { allowed: false, reason: "API key not found" };

  // Block if email not verified
  const user = await prisma.user.findUnique({
    where: { id: apiKey.userId },
    select: { emailVerified: true },
  });
  if (user && !user.emailVerified) {
    return { allowed: false, reason: "Email belum diverifikasi. Cek email Anda." };
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: apiKey.userId, status: "active", endDate: { gt: new Date() } },
    include: { plan: true },
  });

  if (!sub) {
    // No subscription → check free tier limits from PuterLimit table
    const [freePlan, puterLimit] = await Promise.all([
      getPlan("free"),
      prisma.puterLimit.findMany({ take: 1 }),
    ]);
    const limit = puterLimit[0];
    const maxDaily = freePlan?.features?.maxRequestsPerDay || limit?.appMaxRequestsPerDay || 100;
    const maxMonthlyTokens = limit?.freeTokensPerMonth || limit?.appMaxTokensPerMonth || freePlan?.features?.maxTokensPerMonth || 100000;
    const maxMonthlyRequests = limit?.freeRequestsPerMonth || 1000;

    // Check daily request limit
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.usageRecord.count({
      where: { userId: apiKey.userId, createdAt: { gte: today } },
    });
    if (todayCount >= maxDaily) {
      return { allowed: false, reason: `Free tier daily limit reached (${maxDaily} requests)` };
    }

    // Check monthly request limit
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthCount = await prisma.usageRecord.count({
      where: { userId: apiKey.userId, createdAt: { gte: monthStart } },
    });
    if (monthCount >= maxMonthlyRequests) {
      return { allowed: false, reason: `Free tier monthly request limit reached (${maxMonthlyRequests})` };
    }

    // Check monthly token limit
    const monthTokens = await prisma.usageRecord.aggregate({
      where: { userId: apiKey.userId, createdAt: { gte: monthStart } },
      _sum: { totalTokens: true },
    });
    if ((monthTokens._sum.totalTokens || 0) >= maxMonthlyTokens) {
      return { allowed: false, reason: `Free tier monthly token limit reached (${maxMonthlyTokens} tokens)`, plan: freePlan ?? undefined };
    }

    return { allowed: true, plan: freePlan ?? undefined };
  }

  const plan = await getPlan(sub.planId);
  if (!plan) return { allowed: false, reason: "Plan not found" };

  // Check subscription token quota
  if (sub.tokensUsed >= Math.min(plan.features.maxTokensPerMonth, plan.features.maxRequestsPerDay)) {
    return { allowed: false, reason: `Subscription quota exhausted (${sub.tokensUsed}/${plan.features.maxTokensPerMonth} tokens)`, plan };
  }

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

// ====== Model Access ======

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

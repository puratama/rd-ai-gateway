import { prisma } from "../db";
import type { BillingPeriod } from "./plans";

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

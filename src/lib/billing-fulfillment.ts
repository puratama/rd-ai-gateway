import { prisma } from "./db";

export function addBillingPeriod(date: Date, billingPeriod: string): Date {
  const result = new Date(date);
  switch (billingPeriod) {
    case "daily":
      result.setDate(result.getDate() + 1);
      break;
    case "weekly":
      result.setDate(result.getDate() + 7);
      break;
    case "yearly":
      result.setFullYear(result.getFullYear() + 1);
      break;
    default:
      result.setMonth(result.getMonth() + 1);
      break;
  }
  return result;
}

export async function handlePaidBilling(
  billing: {
    id: string;
    userId: string;
    type: string;
    amount: unknown;
    planId: string | null;
    description: string | null;
  }
) {
  if (billing.type === "topup") {
    await prisma.wallet.upsert({
      where: { userId: billing.userId },
      update: { balance: { increment: Number(billing.amount) } },
      create: { userId: billing.userId, balance: Number(billing.amount) },
    });
    return;
  }

  if (!billing.planId) {
    return;
  }

  const plan = await prisma.plan.findUnique({ where: { id: billing.planId } });
  if (!plan) {
    return;
  }

  if (billing.type === "subscription") {
    // Find active subscription for same plan → extend, else create
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: billing.userId, planId: plan.id, status: "active", endDate: { gt: new Date() } },
      orderBy: { endDate: "desc" },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: { endDate: addBillingPeriod(existingSub.endDate, plan.billingPeriod) },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: billing.userId,
          planId: plan.id,
          status: "active",
          endDate: addBillingPeriod(new Date(), plan.billingPeriod),
        },
      });
    }
    return;
  }

  if (billing.type === "package_purchase") {
    await prisma.userPackage.create({
      data: {
        userId: billing.userId,
        planId: plan.id,
        status: "active",
        tokensTotal: plan.maxTokensPerPeriod,
        tokensRemaining: plan.maxTokensPerPeriod,
        expiresAt: addBillingPeriod(new Date(), plan.billingPeriod),
        billingId: billing.id,
      },
    });
  }
}

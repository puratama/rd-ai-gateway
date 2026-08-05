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

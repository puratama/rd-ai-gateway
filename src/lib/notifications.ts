import { prisma } from "@/lib/db";

export function notifyUsageAlert(userId: string, percent: number) {
  return prisma.notification.create({
    data: {
      userId,
      type: "usage_alert",
      title: "Usage Alert",
      message: `You've used ${percent}% of your quota.`,
    },
  });
}

export function notifyLowBalance(userId: string, balance: number) {
  return prisma.notification.create({
    data: {
      userId,
      type: "low_balance",
      title: "Low Balance",
      message: `Your wallet balance is IDR ${balance.toLocaleString()}.`,
    },
  });
}

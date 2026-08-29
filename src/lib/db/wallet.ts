import { prisma } from "../db";

// ====== Wallet ======

export async function getWallet(userId: string) {
  return prisma.wallet.findUnique({ where: { userId } });
}

export async function topupWallet(userId: string, amount: number) {
  return prisma.wallet.upsert({
    where: { userId },
    update: { balance: { increment: amount } },
    create: { userId, balance: amount },
  });
}

export async function deductWallet(userId: string, amount: number) {
  // Atomic guard: only decrement when balance is sufficient (no check-then-act race)
  const updated = await prisma.wallet.updateMany({
    where: { userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (updated.count !== 1) return null;
  return prisma.wallet.findUnique({ where: { userId } });
}

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
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || Number(wallet.balance) < amount) return null;
  return prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });
}

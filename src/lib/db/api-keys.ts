import { prisma } from "../db";

// ====== Helpers ======

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
      wallet: { create: { balance: 0 } },
      apiKeys: {
        create: {
          key: `xpgw_${generateId()}${generateId().slice(0, 16)}`,
          name,
        },
      },
    },
    include: { apiKeys: true, wallet: true },
  });
  return user.apiKeys[0]!;
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

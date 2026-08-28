import { createHash, randomBytes } from "crypto";
import { prisma } from "../db";
import { getSiteSettings } from "@/lib/site-settings";

// ====== Helpers ======

export function generateId(): string {
  return randomBytes(16).toString("hex");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function maskApiKey(key: string | null, prefix?: string): string {
  if (!key) return `${prefix ?? "xpgw_"}••••••••`;
  return key.length <= 12 ? `${key.slice(0, 4)}...` : `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export function generateApiKey(prefix = "xpgw_"): string {
  return `${prefix}${randomBytes(32).toString("hex")}`;
}

// ====== API Keys ======

export async function loadServerKeys() {
  return prisma.apiKey.findMany({
    select: {
      id: true, key: true, name: true, userId: true, isActive: true,
      usageCount: true, totalTokens: true, lastUsed: true, createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function validateServerKey(key: string) {
  const normalizedKey = key.trim();
  return prisma.apiKey.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        { user: { status: "active" } },
        { OR: [{ keyHash: hashApiKey(normalizedKey) }, { key: normalizedKey }] },
      ],
    },
    include: { user: { include: { wallet: true } } },
  });
}

export async function createServerKey(name: string, email?: string) {
  const settings = await getSiteSettings();
  const secret = generateApiKey(settings.apiKeyPrefix);
  const user = await prisma.user.create({
    data: {
      email: email || `${name}-${Date.now()}@generated.local`,
      passwordHash: "generated",
      name,
      wallet: { create: { balance: 0 } },
      apiKeys: {
        create: {
          key: null,
          keyHash: hashApiKey(secret),
          name,
        },
      },
    },
    include: { apiKeys: true, wallet: true },
  });
  return { ...user.apiKeys[0]!, secret };
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

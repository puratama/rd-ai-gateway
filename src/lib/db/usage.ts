import { prisma } from "../db";

// ====== Usage Records ======

export async function loadServerUsageRecords() {
  return prisma.usageRecord.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
}

export async function reconcileApiKeyUsage() {
  const keys = await prisma.apiKey.findMany({ select: { id: true } });
  for (const key of keys) {
    const totals = await prisma.usageRecord.aggregate({
      where: { apiKeyId: key.id },
      _count: { _all: true },
      _sum: { totalTokens: true },
      _max: { createdAt: true },
    });
    await prisma.apiKey.update({
      where: { id: key.id },
      data: {
        usageCount: totals._count._all,
        totalTokens: totals._sum.totalTokens ?? 0,
        lastUsed: totals._max.createdAt,
      },
    });
  }
  return { keys: keys.length };
}

export async function addServerUsageRecord(record: {
  userId: string;
  apiKeyId?: string;
  model: string;
  provider?: string;
  source: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  endpoint: string;
  cost?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.usageRecord.create({ data: { ...record, cost: record.cost ?? undefined } });
    if (record.apiKeyId) {
      await tx.apiKey.update({
        where: { id: record.apiKeyId },
        data: {
          usageCount: { increment: 1 },
          totalTokens: { increment: record.totalTokens },
          lastUsed: created.createdAt,
        },
      });
    }
    return created;
  });
}

export async function getServerUsageSummary(userId: string, apiKeyId?: string) {
  const records = await prisma.usageRecord.findMany({
    where: { userId, ...(apiKeyId ? { apiKeyId } : {}) },
  });
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

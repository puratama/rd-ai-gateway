import { prisma } from "../db";

// ====== Usage Records ======

export async function loadServerUsageRecords() {
  return prisma.usageRecord.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
}

export async function addServerUsageRecord(record: {
  userId: string;
  model: string;
  provider?: string;
  source: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  endpoint: string;
}) {
  return prisma.usageRecord.create({ data: record });
}

export async function getServerUsageSummary(userId: string) {
  const records = await prisma.usageRecord.findMany({ where: { userId } });
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

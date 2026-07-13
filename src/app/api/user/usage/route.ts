import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type UsageSummary = {
  tokens: number;
  cost: number;
  requests: number;
};

const emptySummary = (): UsageSummary => ({ tokens: 0, cost: 0, requests: 0 });

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [allUsageRecords, recentUsageRecords] = await Promise.all([
      prisma.usageRecord.findMany({
        where: { userId: session.sub },
        select: {
          model: true,
          totalTokens: true,
          cost: true,
        },
      }),
      prisma.usageRecord.findMany({
        where: {
          userId: session.sub,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          totalTokens: true,
          cost: true,
          createdAt: true,
        },
      }),
    ]);

    const totals = emptySummary();
    const byModelMap = new Map<string, UsageSummary>();
    const byDayMap = new Map<string, UsageSummary>();

    for (const record of allUsageRecords) {
      const cost = record.cost?.toNumber() ?? 0;
      totals.tokens += record.totalTokens;
      totals.cost += cost;
      totals.requests += 1;

      const modelSummary = byModelMap.get(record.model) ?? emptySummary();
      modelSummary.tokens += record.totalTokens;
      modelSummary.cost += cost;
      modelSummary.requests += 1;
      byModelMap.set(record.model, modelSummary);
    }

    for (const record of recentUsageRecords) {
      const date = dayKey(record.createdAt);
      const daySummary = byDayMap.get(date) ?? emptySummary();
      daySummary.tokens += record.totalTokens;
      daySummary.cost += record.cost?.toNumber() ?? 0;
      daySummary.requests += 1;
      byDayMap.set(date, daySummary);
    }

    return NextResponse.json({
      totalTokens: totals.tokens,
      totalCost: totals.cost,
      totalRequests: totals.requests,
      byModel: Array.from(byModelMap, ([model, summary]) => ({
        model,
        tokens: summary.tokens,
        cost: summary.cost,
        requests: summary.requests,
      })),
      byDay: Array.from(byDayMap, ([date, summary]) => ({
        date,
        tokens: summary.tokens,
        cost: summary.cost,
        requests: summary.requests,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

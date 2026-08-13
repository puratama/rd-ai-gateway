import { NextRequest, NextResponse } from "next/server";

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

function getRangeStart(range: string): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "today":
      break;
    case "week":
      start.setDate(start.getDate() - 6);
      break;
    default: // month
      start.setDate(start.getDate() - 29);
  }
  return start;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const range = request.nextUrl.searchParams.get("range") || "month";
    const startDate = getRangeStart(range);

    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        userId: session.sub,
        createdAt: { gte: startDate },
      },
      select: {
        model: true,
        totalTokens: true,
        cost: true,
        createdAt: true,
        apiKeyId: true,
        promptTokens: true,
        completionTokens: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totals = emptySummary();
    const byModelMap = new Map<string, UsageSummary>();
    const byDayMap = new Map<string, UsageSummary>();

    for (const record of usageRecords) {
      const cost = record.cost?.toNumber() ?? 0;
      totals.tokens += record.totalTokens;
      totals.cost += cost;
      totals.requests += 1;

      const modelSummary = byModelMap.get(record.model) ?? emptySummary();
      modelSummary.tokens += record.totalTokens;
      modelSummary.cost += cost;
      modelSummary.requests += 1;
      byModelMap.set(record.model, modelSummary);

      const date = dayKey(record.createdAt);
      const daySummary = byDayMap.get(date) ?? emptySummary();
      daySummary.tokens += record.totalTokens;
      daySummary.cost += cost;
      daySummary.requests += 1;
      byDayMap.set(date, daySummary);
    }

    return NextResponse.json({
      totalTokens: totals.tokens,
      totalCost: totals.cost,
      totalRequests: totals.requests,
      range,
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
      records: usageRecords.map((record) => ({
        datetime: record.createdAt.toISOString(),
        apiKeyId: record.apiKeyId,
        model: record.model,
        promptTokens: record.promptTokens,
        completionTokens: record.completionTokens,
        totalTokens: record.totalTokens,
        cost: record.cost?.toNumber() ?? 0,
      })), 
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

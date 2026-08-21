import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing aggregator id" }, { status: 400 });

    const aggregator = await prisma.aggregatorConfig.findUnique({ where: { id } });
    if (!aggregator) return NextResponse.json({ error: "Aggregator not found" }, { status: 404 });

    const usage = await prisma.usageRecord.groupBy({
      by: ["provider", "model"],
      where: { provider: aggregator.name },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
      _count: { id: true },
    });

    const totalTokens = usage.reduce((s, u) => s + (u._sum.totalTokens || 0), 0);
    const totalRequests = usage.reduce((s, u) => s + u._count.id, 0);
    const modelCount = usage.length;

    return NextResponse.json({
      aggregatorId: aggregator.id,
      aggregatorName: aggregator.name,
      totalTokens,
      totalRequests,
      modelCount,
      details: usage.map((u) => ({
        provider: u.provider,
        model: u.model,
        requests: u._count.id,
        promptTokens: u._sum.promptTokens || 0,
        completionTokens: u._sum.completionTokens || 0,
        totalTokens: u._sum.totalTokens || 0,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
    const search = request.nextUrl.searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              _count: { select: { billingRecords: true, usageRecords: true } },
            },
          },
        },
        orderBy: { balance: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.wallet.count({ where }),
    ]);

    // Aggregate billing totals per wallet (last 30 days of billing)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const billingAgg = await prisma.billingRecord.groupBy({
      by: ["userId"],
      where: { status: "completed", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });
    const monthlyBillingMap = new Map(billingAgg.map((b) => [b.userId, Number(b._sum.amount || 0)]));

    return NextResponse.json({
      wallets: wallets.map((w) => ({
        id: w.id,
        userId: w.userId,
        email: w.user.email,
        name: w.user.name,
        role: w.user.role,
        balance: Number(w.balance),
        billingCount: w.user._count.billingRecords,
        usageCount: w.user._count.usageRecords,
        monthlySpend: monthlyBillingMap.get(w.userId) || 0,
        updatedAt: w.updatedAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

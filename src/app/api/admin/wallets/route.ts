import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireSuperadmin() {
  const session = await getSession();
  return session?.role === "superadmin";
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireSuperadmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { userId?: unknown; amount?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : "";
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!userId || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: "userId and a non-zero amount are required" }, { status: 400 });
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    });
    return NextResponse.json({ balance: Number(wallet.balance) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

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

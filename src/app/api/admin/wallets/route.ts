import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const body = (await request.json()) as { userId?: unknown; amount?: unknown; description?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : "";
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!userId || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: "userId and a non-zero amount are required" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const wallet = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount },
      });
      await tx.billingRecord.create({
        data: {
          userId,
          type: "admin_adjustment",
          amount,
          status: "paid",
          description,
          paidAt: new Date(),
        },
      });
      return w;
    });
    return NextResponse.json({ balance: Number(wallet.balance) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
export async function GET(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
    const search = request.nextUrl.searchParams.get("search")?.trim();

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          wallet: { select: { id: true, balance: true, updatedAt: true } },
          _count: { select: { billingRecords: true, usageRecords: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Aggregate actual usage cost per wallet (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usageAgg = await prisma.usageRecord.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { cost: true },
    });
    const monthlySpendMap = new Map(usageAgg.map((u) => [u.userId, Number(u._sum.cost || 0)]));

    return NextResponse.json({
      wallets: users.map((u) => ({
        id: u.wallet?.id ?? "",
        userId: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        balance: Number(u.wallet?.balance ?? 0),
        billingCount: u._count.billingRecords,
        usageCount: u._count.usageRecords,
        monthlySpend: monthlySpendMap.get(u.id) || 0,
        updatedAt: u.wallet?.updatedAt ?? u.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

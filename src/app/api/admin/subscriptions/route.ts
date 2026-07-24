import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
    const status = request.nextUrl.searchParams.get("status");

    const where = status ? { status } : {};

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } }, plan: { select: { id: true, name: true, price: true, billingPeriod: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        userId: s.userId,
        email: s.user.email,
        name: s.user.name,
        planId: s.planId,
        planName: s.plan.name,
        price: Number(s.plan.price),
        billingPeriod: s.plan.billingPeriod,
        status: s.status,
        tokensUsed: s.tokensUsed,
        startDate: s.startDate,
        endDate: s.endDate,
        autoRenew: s.autoRenew,
        createdAt: s.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

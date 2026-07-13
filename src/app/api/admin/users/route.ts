import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function requireSuperadmin() {
  const session = await getSession();
  return session?.role === "superadmin";
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireSuperadmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const page = toPositiveInt(request.nextUrl.searchParams.get("page"), DEFAULT_PAGE);
    const limit = Math.min(toPositiveInt(request.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
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
          puterStatus: true,
          createdAt: true,
          _count: {
            select: {
              usageRecords: true,
              subscriptions: true,
              packages: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const usageTotals = await prisma.usageRecord.groupBy({
      by: ["userId"],
      where: { userId: { in: users.map((user) => user.id) } },
      _sum: { totalTokens: true },
    });
    const totalTokensByUserId = new Map(usageTotals.map((usage) => [usage.userId, usage._sum.totalTokens ?? 0]));

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        puterStatus: user.puterStatus,
        createdAt: user.createdAt,
        usageCount: user._count.usageRecords,
        totalTokens: totalTokensByUserId.get(user.id) ?? 0,
        subscriptionCount: user._count.subscriptions,
        packageCount: user._count.packages,
      })),
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

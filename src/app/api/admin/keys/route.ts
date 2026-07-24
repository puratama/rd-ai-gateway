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

    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.apiKey.count({ where }),
    ]);

    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        key: `${k.key.slice(0, 12)}...`,
        name: k.name,
        userId: k.userId,
        email: k.user.email,
        userName: k.user.name,
        role: k.user.role,
        isActive: k.isActive,
        usageCount: k.usageCount,
        totalTokens: k.totalTokens,
        lastUsed: k.lastUsed,
        createdAt: k.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

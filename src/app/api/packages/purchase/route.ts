import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deductWallet } from "@/lib/server-store";
import { getSession } from "@/lib/auth";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token, isActive: true },
      select: { userId: true },
    });
    if (apiKey) return apiKey.userId;
  }
  const session = await getSession();
  return session ? session.sub : null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, expiresAt } = body as { planId: string; expiresAt?: string };

    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    const price = Number(plan.price);
    const deducted = await deductWallet(userId, price);
    if (!deducted) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
    }

    const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const userPackage = await prisma.userPackage.create({
      data: {
        userId,
        planId,
        tokensTotal: plan.maxTokensPerPeriod,
        tokensRemaining: plan.maxTokensPerPeriod,
        expiresAt: expiry,
      },
    });

    return NextResponse.json({
      id: userPackage.id,
      planId,
      tokensTotal: plan.maxTokensPerPeriod,
      tokensRemaining: plan.maxTokensPerPeriod,
      pricePaid: price,
      expiresAt: userPackage.expiresAt,
    }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

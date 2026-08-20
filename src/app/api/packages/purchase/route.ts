import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, corsOptions, resolvePublicUser, withPublicCors } from "@/lib/public-api";

export async function POST(request: NextRequest) {
  try {
    const identity = await resolvePublicUser(request);
    if (!identity) return apiError("Unauthorized", 401, "invalid_api_key");
    const userId = identity.user.id;

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
    const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const userPackage = await prisma.$transaction(async (tx) => {
      const deducted = await tx.wallet.updateMany({
        where: { userId, balance: { gte: price } },
        data: { balance: { decrement: price } },
      });
      if (deducted.count !== 1) return null;

      return tx.userPackage.create({
        data: {
          userId,
          planId,
          tokensTotal: plan.maxTokensPerPeriod,
          tokensRemaining: plan.maxTokensPerPeriod,
          expiresAt: expiry,
        },
      });
    });

    if (!userPackage) return apiError("Insufficient balance", 402, "insufficient_balance", "billing_error");

    return withPublicCors(NextResponse.json({
      id: userPackage.id,
      planId,
      tokensTotal: plan.maxTokensPerPeriod,
      tokensRemaining: plan.maxTokensPerPeriod,
      pricePaid: price,
      expiresAt: userPackage.expiresAt,
    }, { status: 201 }));
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500, "internal_error", "server_error");
  }
}

export function OPTIONS() {
  return corsOptions();
}

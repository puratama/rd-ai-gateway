import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [subscription, packages, wallet] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: session.sub, status: "active", endDate: { gt: new Date() } },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userPackage.findMany({
        where: { userId: session.sub },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.wallet.findUnique({ where: { userId: session.sub } }),
    ]);

    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            tokensUsed: subscription.tokensUsed,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: subscription.autoRenew,
            plan: {
              id: subscription.plan.id,
              name: subscription.plan.name,
              description: subscription.plan.description,
              billingPeriod: subscription.plan.billingPeriod,
              price: Number(subscription.plan.price),
              maxTokensPerPeriod: subscription.plan.maxTokensPerPeriod,
            },
          }
        : null,
      packages: packages.map((p) => ({
        id: p.id,
        status: p.status,
        tokensRemaining: p.tokensRemaining,
        tokensTotal: p.tokensTotal,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
        plan: {
          id: p.plan.id,
          name: p.plan.name,
          description: p.plan.description,
          billingPeriod: p.plan.billingPeriod,
          price: Number(p.plan.price),
          maxTokensPerPeriod: p.plan.maxTokensPerPeriod,
        },
      })),
      balance: wallet ? Number(wallet.balance) : 0,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [packages, wallet] = await Promise.all([
      prisma.userPackage.findMany({
        where: { userId: session.sub },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.wallet.findUnique({ where: { userId: session.sub } }),
    ]);

    return NextResponse.json({
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

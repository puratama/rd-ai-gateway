import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCronAuth } from "@/lib/auth";

/**
 * Cron endpoint: expire UserPackage records past their expiresAt.
 * Also marks packages with tokensRemaining <= 0 as "depleted".
 *
 * GET /api/cron/expire-packages
 * Auth: Bearer CRON_SECRET env var (required in production)
 */
export async function GET(request: NextRequest) {
  const auth = requireCronAuth(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Expire packages past their expiresAt
    let expired = 0;
    try {
      const result = await prisma.userPackage.updateMany({
        where: {
          status: "active",
          expiresAt: { lt: now },
        },
        data: { status: "expired" },
      });
      expired = result.count;
    } catch { /* ignore */ }

    // 2. Deplete packages with 0 or negative tokens remaining
    let depleted = 0;
    try {
      const result = await prisma.userPackage.updateMany({
        where: {
          status: "active",
          tokensRemaining: { lte: 0 },
        },
        data: { status: "depleted" },
      });
      depleted = result.count;
    } catch { /* ignore */ }

    // Also clean up expired packages that are still "active" with tokensRemaining <= 0
    let expiredDepleted = 0;
    try {
      const result = await prisma.userPackage.updateMany({
        where: {
          status: "active",
          expiresAt: { lt: now },
          tokensRemaining: { lte: 0 },
        },
        data: { status: "depleted" },
      });
      expiredDepleted = result.count;
    } catch { /* ignore */ }

    return NextResponse.json({
      updated: expired + depleted + expiredDepleted,
      expired,
      depleted,
      expiredAndDepleted: expiredDepleted,
      stillActive: await prisma.userPackage.count({ where: { status: "active" } }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

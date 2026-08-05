import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCronAuth } from "@/lib/auth";

/**
 * Cron endpoint: monthly maintenance.
 * 1. Mark depleted UserPackage records (tokensRemaining <= 0) as "depleted"
 * 2. Clean up old usage records (>90 days) for performance
 *
 * Free tier "reset" is implicit — usage quota checks filter by current month,
 * so no explicit counter reset is needed.
 *
 * GET /api/cron/monthly-reset
 * Auth: Bearer CRON_SECRET env var (required in production)
 */
export async function GET(request: NextRequest) {
  const auth = requireCronAuth(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Deplete packages with 0 tokens
    let depletedPkgs = 0;
    try {
      const result = await prisma.userPackage.updateMany({
        where: { status: "active", tokensRemaining: { lte: 0 } },
        data: { status: "depleted" },
      });
      depletedPkgs = result.count;
    } catch { /* ignore */ }

    // 2. Clean up old usage records (>90 days) for DB performance
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    let deletedRecords = 0;
    try {
      const result = await prisma.usageRecord.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      deletedRecords = result.count;
    } catch { /* ignore */ }

    // 3. Clean up old billing records (>180 days, only failed/expired)
    const billingCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    let deletedBilling = 0;
    try {
      const result = await prisma.billingRecord.deleteMany({
        where: {
          createdAt: { lt: billingCutoff },
          status: { in: ["failed", "expired"] },
        },
      });
      deletedBilling = result.count;
    } catch { /* ignore */ }

    // Summary
    const stats = await Promise.all([
      prisma.userPackage.count({ where: { status: "active" } }),
      prisma.usageRecord.count(),
    ]);

    return NextResponse.json({
      depletedPackages: depletedPkgs,
      deletedUsageRecords: deletedRecords,
      deletedBillingRecords: deletedBilling,
      remaining: {
        activePackages: stats[0],
        usageRecords: stats[1],
      },
      note: "Free tier quota resets implicitly via month-boundary date filtering in rate limit checks.",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

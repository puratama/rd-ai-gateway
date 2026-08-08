import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health
 * Ping all active aggregators; report overall gateway status.
 * Used by the landing page "status" badge.
 */
export async function GET() {
  const configs = await prisma.aggregatorConfig.findMany({
    where: { isActive: true },
    select: { id: true, name: true, baseUrl: true, apiKeyEnc: true },
  });

  const checks: { id: string; name: string; ok: boolean; status: number; latency: number }[] = [];
  let up = 0;

  for (const agg of configs) {
    const startTime = Date.now();
    let ok = false;
    let status = 0;
    if (agg.apiKeyEnc) {
      try {
        const res = await fetch(`${agg.baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${agg.apiKeyEnc}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });
        ok = res.ok;
        status = res.status;
      } catch {
        // network / timeout → down
      }
    }
    if (ok) up++;
    checks.push({ id: agg.id, name: agg.name, ok, status, latency: Date.now() - startTime });
  }

  const status: "ok" | "degraded" | "down" =
    configs.length === 0 || up === 0 ? "down"
    : up === configs.length ? "ok"
    : "degraded";

  return NextResponse.json({
    status,
    up,
    total: configs.length,
    checks,
  });
}
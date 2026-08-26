import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Capped well under the Docker healthcheck `timeout: 5s` (see Dockerfile).
// Runs in parallel so total time stays bounded regardless of aggregator count.
const HEALTH_TIMEOUT_MS = 2000;

export async function GET() {
  // Best-effort: a DB outage must NOT make this endpoint return 500 and flip
  // the container to "unhealthy". Report DB status as a field instead.
  let configs: { id: string; name: string; baseUrl: string; apiKeyEnc: string | null }[] = [];
  let dbOk = false;
  try {
    configs = await prisma.aggregatorConfig.findMany({
      where: { isActive: true },
      select: { id: true, name: true, baseUrl: true, apiKeyEnc: true },
    });
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const checks = await Promise.all(
    configs.map(async (agg) => {
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
            signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
          });
          ok = res.ok;
          status = res.status;
        } catch {
          // network / timeout → down
        }
      }
      return { id: agg.id, name: agg.name, ok, status, latency: Date.now() - startTime };
    }),
  );

  const up = checks.filter((c) => c.ok).length;
  const status: "ok" | "degraded" | "down" = !dbOk
    ? "down"
    : configs.length === 0 || up === 0
      ? "down"
      : up === configs.length
        ? "ok"
        : "degraded";

  // Always 200 so the container stays "healthy" even if a dependency is down;
  // the `status`/`dbOk` fields carry the real degraded/outage state.
  return NextResponse.json({ status, dbOk, up, total: configs.length, checks });
}

import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/aggregators/test
 * Test connection to an aggregator by sending a lightweight request.
 */
export async function POST(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const agg = await prisma.aggregatorConfig.findUnique({ where: { id } });
    if (!agg) {
      return NextResponse.json({ error: "Aggregator not found" }, { status: 404 });
    }

    const apiKey = agg.apiKeyEnc;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "API key not configured for this aggregator" }, { status: 500 });
    }

    const startTime = Date.now();

    try {
      // Test with a lightweight models list request
      const testRes = await fetch(`${agg.baseUrl}/models`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      const latency = Date.now() - startTime;

      if (testRes.ok) {
        const data = await testRes.json().catch(() => null);
        const modelCount = data?.data?.length ?? data?.models?.length ?? null;
        return NextResponse.json({
          ok: true,
          status: testRes.status,
          latency,
          modelCount,
        });
      } else {
        const errorBody = await testRes.text().catch(() => "");
        return NextResponse.json({
          ok: false,
          status: testRes.status,
          latency,
          error: errorBody.slice(0, 200) || testRes.statusText,
        });
      }
    } catch (fetchError) {
      const latency = Date.now() - startTime;
      return NextResponse.json({
        ok: false,
        status: 0,
        latency,
        error: fetchError instanceof Error ? fetchError.message : "Connection failed",
      });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";

// PATCH /api/admin/aggregators/reorder - Persist aggregator ordering (body: { ids: string[] })
export async function PATCH(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const { reorderAggregators } = await import("@/lib/server-store");
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((v: unknown) => typeof v === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }
    const ok = await reorderAggregators(ids);
    if (!ok) {
      return NextResponse.json({ error: "Failed to reorder aggregators" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";

export async function GET() {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const { getAdminStats } = await import("@/lib/server-store");
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

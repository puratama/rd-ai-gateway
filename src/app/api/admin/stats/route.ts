import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getAdminStats } = await import("@/lib/server-store");
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

// GET /api/announcements - Public: active announcements for guest/client display
export async function GET() {
  try {
    const { loadActiveAnnouncements } = await import("@/lib/server-store");
    const announcements = await loadActiveAnnouncements();
    return NextResponse.json({ announcements });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
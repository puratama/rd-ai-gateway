import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/announcements - List all announcements (auth via middleware)
export async function GET() {
  try {
    const { loadAnnouncements } = await import("@/lib/server-store");
    const announcements = await loadAnnouncements();
    return NextResponse.json({ announcements });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/announcements - Create announcement
export async function POST(request: NextRequest) {
  try {
    const { createAnnouncement } = await import("@/lib/server-store");
    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    if (!title || !description) {
      return NextResponse.json({ error: "title and description are required" }, { status: 400 });
    }
    const announcement = await createAnnouncement({ title, description });
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/announcements - Update announcement
export async function PUT(request: NextRequest) {
  try {
    const { updateAnnouncement } = await import("@/lib/server-store");
    const body = await request.json();
    const id = String(body?.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const updates: { title?: string; description?: string; isActive?: boolean } = {};
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.description === "string") updates.description = body.description.trim();
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    const announcement = await updateAnnouncement(id, updates);
    return NextResponse.json({ announcement });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/announcements?id=xxx - Delete announcement
export async function DELETE(request: NextRequest) {
  try {
    const { deleteAnnouncement } = await import("@/lib/server-store");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const success = await deleteAnnouncement(id);
    if (!success) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
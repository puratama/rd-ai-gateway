import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/conversations/[id] — get single conversation with messages
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { validateServerKey } = await import("@/lib/server-store");
    const key = await validateServerKey(apiKey);
    if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: key.userId },
    });

    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(conversation);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// PUT /api/conversations/[id] — update conversation (title, messages)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { validateServerKey } = await import("@/lib/server-store");
    const key = await validateServerKey(apiKey);
    if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const existing = await prisma.conversation.findFirst({ where: { id, userId: key.userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.messages !== undefined) data.messages = body.messages;
    if (body.model !== undefined) data.model = body.model;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data,
      select: { id: true, title: true, model: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(conversation);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] — delete conversation
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { validateServerKey } = await import("@/lib/server-store");
    const key = await validateServerKey(apiKey);
    if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const existing = await prisma.conversation.findFirst({ where: { id, userId: key.userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.conversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

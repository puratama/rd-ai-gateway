import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/conversations — list user conversations
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { validateServerKey } = await import("@/lib/server-store");
    const key = await validateServerKey(apiKey);
    if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
      where: { userId: key.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, model: true, messages: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(conversations);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// POST /api/conversations — create conversation
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { validateServerKey } = await import("@/lib/server-store");
    const key = await validateServerKey(apiKey);
    if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const body = await request.json();
    const { id, title, model, messages = [] } = body;
    if (!title || !model) return NextResponse.json({ error: "title and model required" }, { status: 400 });

    const conversation = await prisma.conversation.create({
      data: { id, userId: key.userId, title, model, messages },
      select: { id: true, title: true, model: true, messages: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

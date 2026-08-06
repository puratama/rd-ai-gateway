import { NextRequest, NextResponse } from "next/server";
import { loadTicket, replyAsAdmin, updateTicketStatus } from "@/lib/server-store";
import { prisma } from "@/lib/db";

// GET /api/admin/support/[id] — ticket detail
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ticket = await loadTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json({ ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/support/[id] — admin reply
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const ticket = await replyAsAdmin(id, message);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    // notify the ticket owner
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: "support_reply",
        title: "Support reply",
        message: `Your support ticket "${ticket.subject}" has a new reply.`,
      },
    });
    return NextResponse.json({ ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/support/[id] — update status
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body?.status ?? "").trim();
    const allowed = ["open", "in_progress", "resolved", "closed"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }
    const ticket = await updateTicketStatus(id, status);
    return NextResponse.json({ ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

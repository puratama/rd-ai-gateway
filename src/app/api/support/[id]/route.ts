import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadTicket, replyAsUser } from "@/lib/server-store";

// GET /api/support/[id] — ticket detail (owner only)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ticket = await loadTicket(id);
  if (!ticket || ticket.userId !== session.sub) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}

// POST /api/support/[id] — user reply
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const message = String(body?.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  const ticket = await loadTicket(id);
  if (!ticket || ticket.userId !== session.sub) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.status === "closed") {
    return NextResponse.json({ error: "Ticket is closed" }, { status: 400 });
  }
  const updated = await replyAsUser(id, message);
  return NextResponse.json({ ticket: updated });
}

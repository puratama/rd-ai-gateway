import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createTicket, loadUserTickets } from "@/lib/server-store";

// GET /api/support — list current user's tickets
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tickets = await loadUserTickets(session.sub);
  return NextResponse.json({ tickets });
}

// POST /api/support — create a new ticket
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const subject = String(body?.subject ?? "").trim();
    const category = String(body?.category ?? "general").trim();
    const priority = String(body?.priority ?? "normal").trim();
    const message = String(body?.message ?? "").trim();
    if (!subject || !message) {
      return NextResponse.json({ error: "subject and message are required" }, { status: 400 });
    }
    const ticket = await createTicket({ userId: session.sub, subject, category, priority, body: message });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

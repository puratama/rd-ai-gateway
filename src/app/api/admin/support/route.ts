import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { loadAdminTickets } from "@/lib/server-store";

// GET /api/admin/support — list all tickets (auth via middleware)
export async function GET() {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const tickets = await loadAdminTickets();
    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

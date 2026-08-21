import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireSuperadmin(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden: superadmin access required" }, { status: 403 });
  }
  return null;
}

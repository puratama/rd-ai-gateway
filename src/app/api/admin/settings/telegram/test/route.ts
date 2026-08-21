import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { sendTestToAdmins } from "@/lib/telegram";

export async function POST() {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const { ok, message } = await sendTestToAdmins();
    return NextResponse.json({ ok, message }, { status: ok ? 200 : 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendTestToAdmins } from "@/lib/telegram";

async function requireSuperadmin() {
  const session = await getSession();
  return session?.role === "superadmin";
}

export async function POST() {
  try {
    if (!(await requireSuperadmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ok, message } = await sendTestToAdmins();
    return NextResponse.json({ ok, message }, { status: ok ? 200 : 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
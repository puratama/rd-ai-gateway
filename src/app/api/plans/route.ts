import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { loadPlans } = await import("@/lib/server-store");
    const plans = (await loadPlans()).filter((plan) => plan.isActive);
    return NextResponse.json({ plans });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

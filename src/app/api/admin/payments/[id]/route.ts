import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { reviewBillingPayment, ReviewError } from "@/lib/payment-review";

async function requireSuperadmin() {
  const session = await getSession();
  return session?.role === "superadmin";
}

const DECISIONS = ["approve", "reject"] as const;
type Decision = (typeof DECISIONS)[number];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireSuperadmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { decision?: unknown };
    const decision = body.decision;

    if (!DECISIONS.includes(decision as Decision)) {
      return NextResponse.json(
        { error: "decision must be approve or reject" },
        { status: 400 }
      );
    }

    const { status } = await reviewBillingPayment(id, decision as Decision);
    return NextResponse.json({ status });
  } catch (error: unknown) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
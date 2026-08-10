import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handlePaidBilling } from "@/lib/billing-fulfillment";

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

    const billing = await prisma.billingRecord.findUnique({ where: { id } });
    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 });
    }
    if (billing.status !== "pending_confirmation") {
      return NextResponse.json(
        { error: "Only pending_confirmation payments can be reviewed" },
        { status: 409 }
      );
    }

    const updated = await prisma.billingRecord.update({
      where: { id },
      data: {
        status: decision === "approve" ? "paid" : "failed",
        paidAt: decision === "approve" ? new Date() : billing.paidAt,
        verifiedAt: new Date(),
      },
    });

    if (decision === "approve") {
      await handlePaidBilling(updated);
    }

    return NextResponse.json({ status: updated.status });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
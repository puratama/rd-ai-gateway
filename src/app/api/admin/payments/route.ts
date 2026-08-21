import { NextRequest, NextResponse } from "next/server";

import { requireSuperadmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const filter = request.nextUrl.searchParams.get("filter") ?? "pending";

    const where =
      filter === "all"
        ? {}
        : filter === "pending_confirmation"
          ? { status: "pending_confirmation" }
          : { status: "pending" };

    const records = await prisma.billingRecord.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        status: r.status,
        provider: r.provider,
        proofNote: r.proofNote,
        proofImage: r.proofImage,
        orderId: r.midtransOrderId,
        createdAt: r.createdAt,
        paidAt: r.paidAt,
        user: r.user,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
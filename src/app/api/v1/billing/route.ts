import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, corsOptions, resolvePublicUser, withPublicCors } from "@/lib/public-api";

export async function GET(request: NextRequest) {
  try {
    const identity = await resolvePublicUser(request);
    if (!identity) return apiError("Unauthorized", 401, "invalid_api_key");
    const userId = identity.user.id;

    const billing = await prisma.billingRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return withPublicCors(NextResponse.json(billing.map((b) => ({
      id: b.id,
      type: b.type,
      amount: Number(b.amount),
      status: b.status,
      midtransOrderId: b.midtransOrderId,
      createdAt: b.createdAt.toISOString(),
    }))));
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500, "internal_error", "server_error");
  }
}

export function OPTIONS() {
  return corsOptions();
}

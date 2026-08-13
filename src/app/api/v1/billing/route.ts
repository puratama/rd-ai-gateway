import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function resolveUserId(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const { hashApiKey } = await import("@/lib/db/api-keys");
    const apiKey = await prisma.apiKey.findFirst({
      where: { isActive: true, OR: [{ keyHash: hashApiKey(token) }, { key: token }] },
      select: { userId: true },
    });
    if (apiKey) return apiKey.userId;
  }
  const session = await getSession();
  if (session) return session.sub;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const billing = await prisma.billingRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(billing.map((b) => ({
      id: b.id,
      type: b.type,
      amount: Number(b.amount),
      status: b.status,
      midtransOrderId: b.midtransOrderId,
      createdAt: b.createdAt.toISOString(),
    })));
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

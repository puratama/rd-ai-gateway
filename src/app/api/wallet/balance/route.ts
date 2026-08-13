import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function resolveUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const { hashApiKey } = await import("@/lib/db/api-keys");
    const apiKey = await prisma.apiKey.findFirst({
      where: { isActive: true, OR: [{ keyHash: hashApiKey(token) }, { key: token }] },
      include: { user: { include: { wallet: true } } },
    });
    if (apiKey) return apiKey.user;
  }
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { wallet: true },
    });
    return user;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallet = user.wallet;
    return NextResponse.json({
      balance: wallet ? Number(wallet.balance) : 0,
      currency: "IDR",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

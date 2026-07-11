import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token, isActive: true },
      include: { user: { include: { wallet: true } } },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const wallet = apiKey.user.wallet;
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

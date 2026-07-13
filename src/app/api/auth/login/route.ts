import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { apiKey: true, wallet: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const hash = createHash("sha256").update(password + (process.env.AUTH_SALT || "xperimne-salt")).digest("hex");
    if (hash !== user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const role = user.role === "superadmin" ? "superadmin" : "user";
    await createSession({ sub: user.id, email: user.email, role });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role },
      apiKey: user.apiKey?.key,
      wallet: user.wallet ? { balance: Number(user.wallet.balance) } : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

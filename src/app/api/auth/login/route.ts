import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { apiKeys: true, wallet: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Upgrade legacy SHA-256 hash to bcrypt on successful login
    if (needsRehash) {
      const { hashPassword } = await import("@/lib/password");
      const newHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    }

    const role = user.role === "superadmin" ? "superadmin" : "user";
    await createSession({ sub: user.id, email: user.email, role });

    const primaryKey = user.apiKeys.find((k) => k.isActive);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role, status: user.status },
      apiKey: primaryKey?.key ?? null,
      wallet: user.wallet ? { balance: Number(user.wallet.balance) } : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateId } from "@/lib/server-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    // Check existing
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Hash password (simple bcrypt-free for now — use bcryptjs in production)
    const passwordHash = await hashPassword(password);

    // Create user + wallet + API key
    const apiKeyValue = `xpgw_${generateId()}${generateId().slice(0, 16)}`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        puterStatus: "pending",
        wallet: { create: { balance: 0 } },
        apiKey: {
          create: {
            key: apiKeyValue,
            name: `${name || email}'s Key`,
          },
        },
      },
      include: { apiKey: true, wallet: true },
    });

    // Background: register to Puter (non-blocking)
    registerToPuter(user.id).catch(() => {});

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKey: user.apiKey?.key,
    }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function hashPassword(password: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(password + process.env.AUTH_SALT || "xperimne-salt").digest("hex");
}

async function registerToPuter(userId: string) {
  try {
    const puterToken = process.env.PUTER_AUTH_TOKEN;
    if (!puterToken) return;

    await prisma.user.update({
      where: { id: userId },
      data: { puterStatus: "registering" },
    });

    // Puter doesn't have a public user registration API via token.
    // App-level Puter auth is handled transparently in puter.ts using PUTER_AUTH_TOKEN.
    // Mark as ready since the app token covers all user requests.
    await prisma.user.update({
      where: { id: userId },
      data: { puterStatus: "ready" },
    });
  } catch {
    await prisma.user.update({
      where: { id: userId },
      data: { puterStatus: "failed" },
    }).catch(() => {});
  }
}

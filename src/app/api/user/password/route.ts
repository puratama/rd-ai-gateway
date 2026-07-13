import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

function hashPassword(password: string): string {
  return createHash("sha256")
    .update(password + (process.env.AUTH_SALT || "xperimne-salt"))
    .digest("hex");
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.passwordHash !== hashPassword(currentPassword)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.sub },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

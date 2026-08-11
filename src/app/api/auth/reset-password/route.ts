import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/reset-password
 * Set password baru memakai token dari email reset.
 * Body: { token, password }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json({ error: "token and password required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }

    // Anti brute-force token: 5 percobaan / 15 menit per IP
    const rl = rateLimit(request, "reset-password", { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Link reset tidak valid atau sudah kedaluwarsa. Minta link baru." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetExpiresAt: null },
    });

    return NextResponse.json({ message: "Password berhasil diubah. Silakan login." });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

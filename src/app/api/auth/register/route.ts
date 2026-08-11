import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendEmail, buildVerifyHtml, getVerifyUrl, getSiteName } from "@/lib/email";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }

    // Anti account-spam: 5 pendaftaran / jam per IP
    const rl = rateLimit(request, "register", { limit: 5, windowMs: 60 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak pendaftaran dari IP ini. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const verifyToken = randomBytes(24).toString("hex");
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        wallet: { create: { balance: 0 } },
        verifyToken,
        verifyExpiresAt,
      },
      select: { id: true, email: true },
    });

    // Send verification email
    try {
      await sendEmail({
          to: user.email,
          subject: `Verifikasi Email - ${await getSiteName()}`,
          html: await buildVerifyHtml(getVerifyUrl(verifyToken)),
        });
    } catch {
      // Non-fatal — user can re-register
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name, role: "user" },
      message: "Akun dibuat. Cek email untuk verifikasi.",
    }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

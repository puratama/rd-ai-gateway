import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendEmail, buildVerifyHtml, getVerifyUrl } from "@/lib/email";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
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
        subject: "Verifikasi Email - xperimne.ai",
        html: buildVerifyHtml(getVerifyUrl(verifyToken)),
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

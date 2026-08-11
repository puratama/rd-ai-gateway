import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, buildResetHtml, getResetUrl, getSiteName } from "@/lib/email";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/forgot-password
 * Kirim email reset password. Balasan selalu sukses untuk email yang tidak
 * terdaftar (anti user-enumeration), dibedakan via `sent`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // Anti email-bombing: 3 email / jam per IP+email
    const rl = rateLimit(request, `forgot:${email}`, { limit: 3, windowMs: 60 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan reset. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = randomBytes(24).toString("hex");
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpiresAt },
      });

      try {
        await sendEmail({
          to: user.email,
          subject: `Reset Password - ${await getSiteName()}`,
          html: await buildResetHtml(getResetUrl(resetToken)),
        });
        return NextResponse.json({
          sent: true,
          message: "Email reset password sudah dikirim. Cek inbox kamu.",
        });
      } catch {
        return NextResponse.json(
          { sent: false, error: "Gagal mengirim email. Coba lagi nanti atau hubungi support." },
          { status: 500 }
        );
      }
    }

    // Email tidak terdaftar — balas sukses tapi tidak kirim apa-apa
    return NextResponse.json({
      sent: false,
      message: "Jika email terdaftar, link reset password sudah dikirim ke inbox kamu.",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

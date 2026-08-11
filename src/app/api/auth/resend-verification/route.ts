import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, buildVerifyHtml, getVerifyUrl, getSiteName } from "@/lib/email";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/resend-verification
 * Kirim ulang email verifikasi. Balasan selalu sukses untuk email yang tidak
 * terdaftar (anti user-enumeration), tapi body-nya dibedakan via `sent`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // Anti email-bombing: 3 email / jam per IP+email
    const rl = rateLimit(request, `resend:${email}`, { limit: 3, windowMs: 60 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak kirim ulang. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.emailVerified) {
      const verifyToken = randomBytes(24).toString("hex");
      const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { verifyToken, verifyExpiresAt },
      });

      try {
        await sendEmail({
          to: user.email,
          subject: `Verifikasi Email - ${await getSiteName()}`,
          html: await buildVerifyHtml(getVerifyUrl(verifyToken)),
        });
        return NextResponse.json({
          sent: true,
          message: "Email verifikasi sudah dikirim ulang. Cek inbox kamu.",
        });
      } catch {
        return NextResponse.json(
          { sent: false, error: "Gagal mengirim email. Coba lagi nanti atau hubungi support." },
          { status: 500 }
        );
      }
    }

    if (user?.emailVerified) {
      return NextResponse.json(
        { sent: false, error: "Email ini sudah terverifikasi. Silakan login." },
        { status: 400 }
      );
    }

    // Email tidak terdaftar — balas sukses tapi tidak kirim apa-apa
    return NextResponse.json({
      sent: false,
      message: "Jika email terdaftar, link verifikasi sudah dikirim ke inbox kamu.",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

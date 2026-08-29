import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, buildResetHtml, getResetUrl, getSiteName } from "@/lib/email";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

// Balasan identik untuk semua kasus (terdaftar/tidak, terkirim/gagal) — anti user-enumeration.
const GENERIC_RESPONSE = {
  message: "Jika email terdaftar, link reset password sudah dikirim ke inbox kamu.",
};

/**
 * POST /api/auth/forgot-password
 * Kirim email reset password. Respons selalu sukses generik (anti user-enumeration).
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
      } catch (e) {
        // Gagal kirim pun dibalas generik — jangan bocorkan status pengiriman.
        console.error("[forgot-password] sendEmail failed:", e);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

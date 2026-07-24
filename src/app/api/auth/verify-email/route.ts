import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token || typeof token !== "string") {
      return new Response(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:48px">
          <h1>Token tidak valid</h1><p>Link verifikasi tidak memiliki token.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const user = await prisma.user.findUnique({ where: { verifyToken: token } });
    if (!user || !user.verifyExpiresAt || user.verifyExpiresAt < new Date()) {
      return new Response(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:48px">
          <h1>Token kedaluwarsa</h1><p>Link verifikasi sudah tidak berlaku. Register ulang.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), verifyToken: null, verifyExpiresAt: null },
    });

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:48px;text-align:center">
        <h1>✅ Email Terverifikasi</h1>
        <p>Akun Anda sudah aktif. Silakan login.</p>
        <a href="/login" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px">Login</a>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

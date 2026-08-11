import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/verify-email?token=...
 * Legacy: link lama dari email diarahkan ke halaman React /verify-email
 * yang memverifikasi token dan menampilkan hasil dengan desain app.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const url = new URL(`/verify-email?token=${encodeURIComponent(token)}`, request.url);
  return NextResponse.redirect(url);
}

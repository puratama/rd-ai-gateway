import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSecret, COOKIE_NAME } from "@/lib/auth-config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin pages and API routes.
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role as string | undefined;
    const status = payload.status as string | undefined;

    if (status !== "active") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (role !== "superadmin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: superadmin access required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

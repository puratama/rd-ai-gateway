import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSecret, COOKIE_NAME } from "@/lib/auth-config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isUserRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/keys") ||
    pathname.startsWith("/usage") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/my/") ||
    pathname.startsWith("/plan") ||
    pathname.startsWith("/models") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/api/user/") ||
    pathname.startsWith("/api/wallet/") ||
    pathname.startsWith("/api/packages/") ||
    pathname.startsWith("/api/support/") ||
    pathname.startsWith("/api/notifications/");

  if (!isAdminRoute && !isUserRoute) {
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

    // Admin routes: require superadmin role
    if (isAdminRoute && role !== "superadmin") {
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
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/keys/:path*",
    "/usage/:path*",
    "/settings/:path*",
    "/my/:path*",
    "/plan/:path*",
    "/models/:path*",
    "/support/:path*",
    "/payment/:path*",
    "/api/user/:path*",
    "/api/wallet/:path*",
    "/api/packages/:path*",
    "/api/support/:path*",
    "/api/notifications/:path*",
  ],
};

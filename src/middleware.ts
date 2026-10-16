import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-shree-niwas-office-system-2026-key"
);

const AUTH_COOKIE_NAME = "sn_session";

// Public routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets, next internal files, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path));

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  let sessionPayload = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionPayload = payload as { role: string; userId: string };
    } catch {
      sessionPayload = null;
    }
  }

  // 1. If accessing login while authenticated, redirect to dashboard
  if (isPublicPath) {
    if (sessionPayload && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 2. If unauthenticated, redirect to login page (or return 401 for API routes)
  if (!sessionPayload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Role-Based Route Guards
  const role = sessionPayload.role;

  // Super-admin only paths
  if (pathname.startsWith("/settings") || pathname.startsWith("/audit-logs")) {
    if (role !== "SUPER_ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Super Administrator privileges required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url));
    }
  }

  // Finance restricted paths
  if (pathname.startsWith("/finance")) {
    const allowed = ["SUPER_ADMIN", "OFFICE_MANAGER", "ACCOUNTANT"];
    if (!allowed.includes(role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Finance access restricted" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

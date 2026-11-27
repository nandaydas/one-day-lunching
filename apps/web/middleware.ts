// ============================================================
// Nimantro — Next.js Middleware
// apps/web/middleware.ts
// ============================================================

import { type NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/editor"];

// Routes that should redirect authenticated users to dashboard
const AUTH_ROUTES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Firebase session cookie
  // We use a lightweight cookie check here — the actual Auth verification
  // happens server-side in each route via the Admin SDK
  const sessionCookie = request.cookies.get("__session")?.value;
  const isAuthenticated = Boolean(sessionCookie);

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation files)
     * - favicon.ico
     * - public files
     * - api routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon|public|icons|fonts|api).*)",
  ],
};

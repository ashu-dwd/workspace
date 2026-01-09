import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// proxy function handles all incoming requests
// runs before matching routes, enabling auth checks, redirects, etc.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;

  // allowing API routes to pass through without modification
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // allowing static files to pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public routes that should be accessible without authentication
  const isAuthRoute = pathname.startsWith("/auth");
  const isProtectedRoute =
    pathname === "/" || pathname.startsWith("/dashboard");

  // If the user is on an auth route and has an access token, redirect to dashboard
  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If the user is on a protected route and has no access token, redirect to login
  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

// matcher configuration defines which routes the proxy applies to
// using negative lookahead to exclude static files and api routes from heavy processing
export const config = {
  matcher: [
    // matching all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

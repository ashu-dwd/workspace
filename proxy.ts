import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// proxy function handles all incoming requests
// runs before matching routes, enabling auth checks, redirects, etc.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // allowing API routes to pass through without modification
  // this prevents breaking /api/* endpoints
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // allowing static files and Next.js internals to pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // TODO: Add your custom proxy logic here
  // examples:
  // - authentication checks
  // - redirects based on user state
  // - adding custom headers
  // - rewriting URLs

  // allowing the request to continue to the next handler
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

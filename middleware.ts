import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Unconditionally allow Android Digital Asset Links
  if (pathname === "/.well-known/assetlinks.json" || pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  // Unconditionally allow /node/ fallback route
  if (pathname.startsWith("/node/") || pathname === "/node") {
    return NextResponse.next();
  }

  // Allow Next.js static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // Password protection for any other WIP routes
  const authCookie = request.cookies.get("site_auth_session")?.value;
  const isAuthorized = authCookie === "authenticated_valid_token";

  if (pathname === "/site-login" || pathname === "/api/site-auth") {
    return NextResponse.next();
  }

  if (!isAuthorized) {
    const loginUrl = new URL("/site-login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

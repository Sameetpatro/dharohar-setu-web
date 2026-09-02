import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Digital Asset Links
  if (pathname === "/.well-known/assetlinks.json" || pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  // Allow fallback routes
  if (
    pathname.startsWith("/note/") || pathname === "/note" ||
    pathname.startsWith("/node/") || pathname === "/node"
  ) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // Password protection for other pages
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

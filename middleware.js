import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "lumen_session";
const PUBLIC_PATHS = ["/login", "/register"];

// Paths anyone can view without signing in (read-only browsing, Instagram-style).
// Actions on these pages (like, comment, follow, etc.) are still gated by the
// APIs themselves and by client-side redirects to /login.
function isGuestViewable(pathname) {
  if (pathname === "/" || pathname === "/reels") return true;
  if (pathname.startsWith("/p/")) return true; // shared post permalinks
  if (pathname.startsWith("/profile/") && !pathname.startsWith("/profile/edit")) return true;
  return false;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let authed = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "dev-secret-change-me"
      );
      await jwtVerify(token, secret);
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    if (authed) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!authed) {
    if (isGuestViewable(pathname)) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

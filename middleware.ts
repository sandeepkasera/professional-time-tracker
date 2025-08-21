// /middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log("Middleware pathname:", pathname);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/";
  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get("app_session")?.value;
//   console.log("Middleware cookie:", cookie);
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login"; // we’ll route alias to (auth)/login
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"], 
};

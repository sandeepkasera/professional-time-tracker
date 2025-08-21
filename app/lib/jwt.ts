// /lib/jwt.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "app_session";

export type JwtPayload = {
  sub: string;           // user id
  email?: string | null; // user email
  role?: string | null;  // app role
};

export async function signJwt(payload: JwtPayload) {
  const days = parseInt(process.env.JWT_EXPIRES_DAYS || "7", 10);
  const exp = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .setIssuedAt()
    .sign(secret);
}

export async function verifyJwt(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as JwtPayload & { exp: number; iat: number };
}

export async function setSessionCookie(token: string) {
  (await cookies()).set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}

export async function getSessionCookie() {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

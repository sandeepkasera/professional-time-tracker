// /app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/app/lib/hash";
import { signJwt } from "@/app/lib/jwt"; // no need to import setSessionCookie here

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_NAME = "app_session";

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.hashedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.hashedPassword);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  if (!user.isActive) return NextResponse.json({ error: "Account disabled" }, { status: 403 });

  const token = await signJwt({
    sub: user.id,
    email: user.email ?? null,
    role: user.role ?? null,
  });

  // 🔑 Attach cookie to response
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}

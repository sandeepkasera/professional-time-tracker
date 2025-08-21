// /app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/app/lib/hash";
import { signJwt, setSessionCookie } from "@/app/lib/jwt";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user || !user.hashedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.hashedPassword);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  if (!user.isActive) return NextResponse.json({ error: "Account disabled" }, { status: 403 });

  const token = await signJwt({ sub: user.id, email: user.email ?? null, role: user.role ?? null });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}

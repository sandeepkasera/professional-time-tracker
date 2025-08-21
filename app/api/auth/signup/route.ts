// /app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/app/lib/hash";
import { signJwt, setSessionCookie } from "@/app/lib/jwt";
import { randomUUID } from "crypto";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationId: z.number().optional(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, firstName, lastName, organizationId } = parsed.data;

  // check existing
  const [exists] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const id = randomUUID();
  const hashedPassword = await hashPassword(password);

  await db.insert(users).values({
    id,
    email: email.toLowerCase(),
    firstName,
    lastName,
    hashedPassword,
    role: "user", // default
    organizationId: organizationId ?? null,
    isActive: true,
  });

  const token = await signJwt({ sub: id, email, role: "consultant" });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}

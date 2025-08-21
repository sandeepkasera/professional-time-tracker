// /app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { addHours } from "date-fns";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true }); // avoid leaking emails

  const email = parsed.data.email.toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt: addHours(new Date(), 2),
  });

  // Since no email yet, return the token (dev-only)
  return NextResponse.json({ ok: true, resetToken: token });
}

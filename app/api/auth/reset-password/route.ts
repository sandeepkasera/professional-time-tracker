// /app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { users, passwordResetTokens } from "@/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import { hashPassword } from "@/app/lib/hash";

const bodySchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { token, newPassword } = parsed.data;
  const now = new Date();

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  const hashed = await hashPassword(newPassword);
  await db.update(users).set({ hashedPassword: hashed, requirePasswordChange: false }).where(eq(users.id, row.userId));

  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));

  return NextResponse.json({ ok: true });
}

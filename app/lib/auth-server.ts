// /lib/auth-server.ts
import { getSessionCookie, verifyJwt } from "./jwt";
import { db } from "./db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const token = await getSessionCookie();
  if (!token) return null;
  try {
    const payload = await verifyJwt(token);
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

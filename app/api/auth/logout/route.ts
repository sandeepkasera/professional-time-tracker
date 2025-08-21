
// /app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/app/lib/jwt";

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}

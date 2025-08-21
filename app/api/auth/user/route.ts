// app/api/auth/user/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/app/lib/db"; // Your Drizzle ORM instance
import { users } from "@/db/schema"; // Your user schema
import { eq } from "drizzle-orm";
import { verifyJwt } from "@/app/lib/jwt";

export async function GET() {
  // Get JWT token from cookie
  const cookieStore = cookies();
  const token = (await cookieStore).get("app_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyJwt(token);
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!payload?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Query user from database by user id (sub)
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1)
    .then((results: string | any[]) => (results.length > 0 ? results[0] : null));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Return user info (choose what to expose)
  return NextResponse.json({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    profileImageUrl: user.profile_image_url,
  });
}

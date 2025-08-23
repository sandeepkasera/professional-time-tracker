// /app/api/timesheets/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { db } from "@/app/lib/db";
import { timesheets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    let result;
    if (user.role === "admin") {
      result = await db.select().from(timesheets);
    } else {
      result = await db
        .select()
        .from(timesheets)
        .where(eq(timesheets.userId, user.id));
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error fetching timesheets:", err);
    return NextResponse.json({ message: "Failed to fetch timesheets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const newTimesheet = {
      ...body,
      userId: user.id,
      status: "draft",
    };

    const [inserted] = await db.insert(timesheets).values(newTimesheet).returning();
    return NextResponse.json(inserted);
  } catch (err) {
    console.error("Error creating timesheet:", err);
    return NextResponse.json({ message: "Failed to create timesheet" }, { status: 500 });
  }
}

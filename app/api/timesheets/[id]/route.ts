// /app/api/timesheets/[id]/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { db } from "@/app/lib/db";
import { timesheets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = Number(params.id);
    const existing = await db.select().from(timesheets).where(eq(timesheets.id, id)).limit(1);

    if (!existing.length) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (existing[0].userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await db.delete(timesheets).where(eq(timesheets.id, id));
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting timesheet:", err);
    return NextResponse.json({ message: "Failed to delete timesheet" }, { status: 500 });
  }
}

// /app/api/timesheets/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { db } from "@/app/lib/db";
import { timesheets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "project_manager")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const id = Number(params.id);
    const [updated] = await db
      .update(timesheets)
      .set({ status: "approved", approverId: user.id })
      .where(eq(timesheets.id, id))
      .returning();

    if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error approving timesheet:", err);
    return NextResponse.json({ message: "Failed to approve timesheet" }, { status: 500 });
  }
}

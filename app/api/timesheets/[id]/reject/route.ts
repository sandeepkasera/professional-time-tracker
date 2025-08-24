// /app/api/timesheets/[id]/reject/route.ts
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

    // Only admins & project managers can reject
    if (!user || (user.role !== "admin" && user.role !== "project_manager")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { reason } = await req.json();
    if (!reason) {
      return NextResponse.json(
        { message: "Rejection reason required" },
        { status: 400 }
      );
    }

    const id = Number(params.id);

    const [updated] = await db
      .update(timesheets)
      .set({
        status: "rejected",
        rejectionReason: reason,
        approvedBy: user.id,   // ✅ fixed field
        approvedAt: new Date() // optional: track when rejected
      })
      .where(eq(timesheets.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ message: "Timesheet not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Timesheet rejected successfully",
      timesheet: updated,
    });
  } catch (err) {
    console.error("Error rejecting timesheet:", err);
    return NextResponse.json({ message: "Failed to reject timesheet" }, { status: 500 });
  }
}

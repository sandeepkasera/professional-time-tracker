// /app/api/timesheets/[id]/approve/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { db } from "@/app/lib/db";
import { timesheets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Only admins and project managers can approve
    if (!user || (user.role !== "admin" && user.role !== "project_manager")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Extract timesheet ID from URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/"); 
    // ["", "api", "timesheets", "123", "approve"]
    const idStr = pathSegments[pathSegments.length - 2]; // second-to-last segment
    const id = Number(idStr);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid timesheet ID" }, { status: 400 });
    }

    // Update timesheet with approved status and approver
    const [updated] = await db
      .update(timesheets)
      .set({
        status: "approved",
        approvedBy: user.id, // fixed field name
        approvedAt: new Date(), // track approval timestamp
      })
      .where(eq(timesheets.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ message: "Timesheet not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Timesheet approved successfully",
      timesheet: updated,
    });
  } catch (err) {
    console.error("Error approving timesheet:", err);
    return NextResponse.json({ message: "Failed to approve timesheet" }, { status: 500 });
  }
}

// /app/api/timesheets/[id]/reject/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { db } from "@/app/lib/db";
import { timesheets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Only admins & project managers can reject
    if (!user || (user.role !== "admin" && user.role !== "project_manager")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const reason = body.reason;
    if (!reason) {
      return NextResponse.json({ message: "Rejection reason required" }, { status: 400 });
    }

    // Extract timesheet ID from URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/"); 
    // ["", "api", "timesheets", "123", "reject"]
    const idStr = pathSegments[pathSegments.length - 2]; // second-to-last segment
    const id = Number(idStr);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid timesheet ID" }, { status: 400 });
    }

    // Update timesheet with rejected status, reason, and approver
    const [updated] = await db
      .update(timesheets)
      .set({
        status: "rejected",
        rejectionReason: reason,
        approvedBy: user.id,   // fixed field name
        approvedAt: new Date() // track rejection timestamp
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

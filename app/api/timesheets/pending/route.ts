import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "project_manager" && user.role !== "admin")) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const timesheets = await storage.getTimesheetsByStatus(
      "submitted",
      user.role === "project_manager" ? user.id : undefined,
    );

    return NextResponse.json(timesheets);
  } catch (error) {
    console.error("Error fetching pending timesheets:", error);
    return NextResponse.json({ message: "Failed to fetch pending timesheets" }, { status: 500 });
  }
}

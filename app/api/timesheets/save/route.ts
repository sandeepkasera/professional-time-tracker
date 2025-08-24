import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { weekCommencing, days } = await req.json();

    const savedTimesheets: any[] = [];

    for (const day of days) {
      for (const project of day.projects) {
        if (project.timesheetId) {
          const existing = await storage.getTimesheet(project.timesheetId);
          if (existing && (existing.status === "draft" || existing.status === "rejected")) {
            if (project.hours > 0) {
              const updated = await storage.updateTimesheet(project.timesheetId, {
                hours: project.hours.toString(),
                description: project.description || "",
                status: "draft",
              });
              if (updated) savedTimesheets.push(updated);
            } else {
              await storage.deleteTimesheet(project.timesheetId);
            }
          }
        } else if (project.hours > 0) {
          const timesheet = await storage.createTimesheet({
            userId: user.id, // ✅ now safe because user is not null
            projectId: project.projectId,
            date: day.date,
            hours: project.hours.toString(),
            description: project.description || "",
            type: "billable",
            status: "draft",
          });
          savedTimesheets.push(timesheet);
        }
      }
    }

    return NextResponse.json({
      message: "Timesheet saved successfully",
      timesheets: savedTimesheets,
    });
  } catch (error) {
    console.error("Error saving timesheet:", error);
    return NextResponse.json({ message: "Failed to save timesheet" }, { status: 500 });
  }
}

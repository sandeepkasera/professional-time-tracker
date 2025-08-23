import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { weekCommencing, days } = await req.json();

    const weekStart = new Date(weekCommencing);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const existingRejected = await storage.getTimesheetsByDateRange(
      weekCommencing,
      weekEnd.toISOString().split("T")[0],
      user.id,
    );
    for (const t of existingRejected) {
      if (t.status === "rejected") {
        await storage.updateTimesheet(t.id, { status: "draft" });
      }
    }

    const submittedTimesheets: any[] = [];
    const projectManagers = new Set<string>();

    const existingTimesheets = await storage.getTimesheetsByDateRange(
      weekCommencing,
      weekEnd.toISOString().split("T")[0],
      user.id,
    );

    for (const day of days) {
      for (const project of day.projects) {
        if (project.hours > 0) {
          const dayDate = new Date(day.date).toISOString().split("T")[0];
          const matches = existingTimesheets.filter((t) => {
            const tDate = new Date(t.date).toISOString().split("T")[0];
            return tDate === dayDate && t.projectId === project.projectId;
          });

          const draft = matches.find((t) => t.status === "draft");
          const submitted = matches.find((t) => t.status === "submitted");
          const approved = matches.find((t) => t.status === "approved");

          if (approved) continue;

          if (draft) {
            const updated = await storage.updateTimesheet(draft.id, {
              hours: project.hours.toString(),
              description: project.description || "",
              status: "submitted",
            });
            if (updated) submittedTimesheets.push(updated);
          } else if (!submitted) {
            const created = await storage.createTimesheet({
              userId: user.id,
              projectId: project.projectId,
              date: day.date,
              hours: project.hours.toString(),
              description: project.description || "",
              type: "billable",
              status: "submitted",
            });
            submittedTimesheets.push(created);
          }

          const projectData = await storage.getProject(project.projectId);
          if (projectData?.projectManagerId) {
            projectManagers.add(projectData.projectManagerId);
          }
        }
      }
    }

    for (const managerId of projectManagers) {
      await storage.createNotification({
        userId: managerId,
        type: "timesheet_submitted",
        title: "New Timesheet for Approval",
        message: `${user.firstName || "A team member"} submitted a timesheet for week commencing ${weekCommencing}`,
        actionRequired: true,
        actionUrl: "/approvals",
        actionText: "Review Timesheet",
        isRead: false,
      });
    }

    return NextResponse.json({ message: "Timesheet submitted successfully", timesheets: submittedTimesheets });
  } catch (error) {
    console.error("Error submitting timesheet:", error);
    return NextResponse.json({ message: "Failed to submit timesheet" }, { status: 500 });
  }
}

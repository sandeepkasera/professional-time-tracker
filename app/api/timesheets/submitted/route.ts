import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const timesheets = await storage.getTimesheets(user.id);

    const submittedOnly = timesheets.filter((t: any) => t.status !== "draft");

    // group by week + project
    const weeklyAggregated = submittedOnly.reduce(
      (acc: Record<string, any>, timesheet: any) => {
        const weekKey = `${timesheet.weekCommencing}-${timesheet.projectId}`;

        if (!acc[weekKey]) {
          acc[weekKey] = {
            id: timesheet.id,
            userId: timesheet.userId,
            projectId: timesheet.projectId,
            projectResourceId: timesheet.projectResourceId,
            weekCommencing: timesheet.weekCommencing,
            status: timesheet.status,
            totalHours: 0,
            submittedAt: timesheet.submittedAt,
            project: timesheet.project ?? null,
            projectResource: timesheet.projectResource ?? null,
            approver: (timesheet as any).approver ?? null,
            user: timesheet.user ?? null,
            workDescription: timesheet.workDescription ?? "",
          };
        }

        acc[weekKey].totalHours += parseFloat(timesheet.hours || "0");
        return acc;
      },
      {}
    );

    return NextResponse.json(Object.values(weeklyAggregated));
  } catch (error) {
    console.error("Error fetching submitted timesheets:", error);
    return NextResponse.json(
      { message: "Failed to fetch submitted timesheets" },
      { status: 500 }
    );
  }
}

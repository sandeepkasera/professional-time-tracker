// app/api/client-portal/timesheets/[projectId]/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await storage.getUser(currentUser.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const projectIdNum = parseInt(params.projectId, 10);
    if (isNaN(projectIdNum) || projectIdNum <= 0) {
      return NextResponse.json(
        { message: "Invalid project ID format" },
        { status: 400 },
      );
    }

    const timesheets = await storage.getTimesheets();
    const projectTimesheets = timesheets.filter(
      (t: any) => t.projectId === projectIdNum,
    );

    return NextResponse.json(projectTimesheets);
  } catch (error) {
    console.error("Error fetching project timesheets:", error);
    return NextResponse.json(
      { message: "Failed to fetch timesheets" },
      { status: 500 },
    );
  }
}

// app/api/client-portal/projects/[projectId]/route.ts
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

    const project = await storage.getProject(projectIdNum);
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project details:", error);
    return NextResponse.json(
      { message: "Failed to fetch project details" },
      { status: 500 },
    );
  }
}

// /app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { db } from "@/app/lib/db";
import { projectResources } from "@/db/schema";
import { storage } from "@/app/lib/storage";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const projectId = parseInt(params.id, 10);
    const project = await storage.getProject(projectId);

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ message: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (
      !user ||
      !["admin", "Administrator", "project_manager", "Project Manager", "director", "Director"].includes(user.role || "")
    ) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const projectId = parseInt(params.id, 10);
    const existingProject = await storage.getProject(projectId);

    if (!existingProject) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const { roleCards, ...projectData } = await req.json();

    // Clean projectManagerId
    if (projectData.projectManagerId === "") {
      delete projectData.projectManagerId;
    }

    // Normalize budget
    if (projectData.budget !== undefined) {
      if (projectData.budget === "" || projectData.budget === null) {
        delete projectData.budget;
      } else if (typeof projectData.budget === "string") {
        const budgetNum = parseFloat(projectData.budget);
        if (!isNaN(budgetNum)) projectData.budget = budgetNum;
        else delete projectData.budget;
      }
    }

    const project = await storage.updateProject(projectId, projectData);

    if (roleCards && Array.isArray(roleCards)) {
      // Clear existing resources and role types
      const existingResources = await storage.getProjectResources(projectId);
      for (const resource of existingResources) {
        await db.delete(projectResources).where(eq(projectResources.id, resource.id));
      }
      await storage.clearProjectRoleTypes(projectId);

      for (const roleCard of roleCards) {
        const roleTypeData = {
          projectId,
          roleTypeName: roleCard.roleName,
          hourlyRate: String(roleCard.hourlyRate),
          description: `${roleCard.roleId} - ${roleCard.currency}`,
        };

        const createdRoleType = await storage.createProjectRoleType(roleTypeData);

        if (roleCard.assignedUserId && roleCard.assignedUserId !== "unassigned") {
          const resourceData = {
            projectId,
            userId: roleCard.assignedUserId,
            roleTypeId: createdRoleType.id,
            allocatedHours: roleCard.totalHours || 0,
          };
          await storage.createProjectResource(resourceData);
        }
      }
    }

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { message: "Failed to update project", error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}

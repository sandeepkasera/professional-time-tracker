// /app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage"; // <- you need to hook this to your db layer
import { insertProjectSchema } from "@/db/schema"; // your zod schema
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let projects;
    if (user.role === "project_manager") {
      projects = await storage.getProjectsByManager(user.id);
    } else if (user.role === "consultant") {
      projects = await storage.getProjectsByUser(user.id);
    } else {
      projects = await storage.getProjects();
    }

    const projectsWithRoleCards = projects.map((project: any) => {
      const roleCards =
        project.roleTypes?.map((roleType: any) => {
          const assignedResources =
            project.resources?.filter((r: any) => r.roleType?.id === roleType.id) || [];

          const assignedUsers = assignedResources.map((resource: any) => ({
            id: resource.user?.id,
            name: resource.user
              ? `${resource.user.firstName} ${resource.user.lastName}`
              : "Unassigned",
          }));

          const totalHours = assignedResources.reduce(
            (sum: number, resource: any) => sum + parseFloat(String(resource.allocatedHours || 0)),
            0,
          );

          const hourlyRate = parseFloat(roleType.hourlyRate);
          const totalCost = totalHours * hourlyRate;

          return {
            roleId: roleType.description?.split(" - ")[0] || String(roleType.id),
            roleName: roleType.roleTypeName,
            hourlyRate,
            currency: "USD",
            totalHours,
            totalCost,
            assignedUsers,
          };
        }) || [];

      return { ...project, roleCards };
    });

    return NextResponse.json(projectsWithRoleCards);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ message: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "project_manager")) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const projectData = insertProjectSchema.parse(body);

    const project = await storage.createProject(projectData);
    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Error creating project:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid project data", errors: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Failed to create project" }, { status: 500 });
  }
}

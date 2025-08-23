// app/api/analytics/projects/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage"; // you'll define this helper

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "admin" && currentUser.role !== "project_manager") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const metrics = await storage.getProjectMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching project analytics:", error);
    return NextResponse.json(
      { message: "Failed to fetch project analytics" },
      { status: 500 }
    );
  }
}

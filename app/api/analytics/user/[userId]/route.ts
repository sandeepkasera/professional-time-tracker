// app/api/analytics/user/[userId]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Extract userId from the URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/"); // e.g., ["", "api", "analytics", "user", "123"]
    const targetUserId = pathSegments[pathSegments.length - 1]; // last segment

    const requestingUserId = currentUser.id;

    // Only allow self OR admin/PM
    if (
      targetUserId !== requestingUserId &&
      currentUser.role !== "admin" &&
      currentUser.role !== "project_manager"
    ) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const searchParams = url.searchParams;
    const startDate =
      searchParams.get("startDate") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];

    const metrics = await storage.getUserMetrics(targetUserId, startDate, endDate);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json({ message: "Failed to fetch user analytics" }, { status: 500 });
  }
}

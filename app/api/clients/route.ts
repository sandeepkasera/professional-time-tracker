// app/api/clients/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth-server";
import { storage } from "@/app/lib/storage";
import { z } from "zod";

// Validation schema
const insertClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const clients = await storage.getClients();
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { message: "Failed to fetch clients" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await storage.getUser(currentUser.id);
    if (!user || (user.role !== "admin" && user.role !== "project_manager")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const clientData = insertClientSchema.parse(body);

    const client = await storage.createClient(clientData);
    return NextResponse.json(client);
  } catch (error: any) {
    console.error("Error creating client:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid client data", errors: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: "Failed to create client" },
      { status: 500 },
    );
  }
}

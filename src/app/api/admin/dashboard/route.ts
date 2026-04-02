import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getDashboardStats } from "@/lib/db/admin-queries";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Admin dashboard GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

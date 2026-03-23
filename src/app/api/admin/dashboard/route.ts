import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { getDashboardStats } from "@/lib/db/admin-queries";

export async function GET(request: NextRequest) {
  try {
    initializeDatabase();

    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Admin dashboard GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { adminGetReservations } from "@/lib/db/admin-queries";

export async function GET(request: NextRequest) {
  try {
    initializeDatabase();

    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    const result = adminGetReservations({ status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin reservations GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

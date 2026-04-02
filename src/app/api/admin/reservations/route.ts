import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { adminGetReservations } from "@/lib/db/admin-queries";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = limitRaw ? Math.min(parseInt(limitRaw, 10) || 50, 100) : undefined;
    const offset = offsetRaw ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : undefined;

    const result = await adminGetReservations({ status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin reservations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

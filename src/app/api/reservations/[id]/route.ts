import { NextRequest, NextResponse } from "next/server";
import { getReservationById } from "@/lib/db/reservation-queries";
import { getAdminFromRequest } from "@/lib/auth";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");

    const reservation = await getReservationById(id);

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const isAdmin = getAdminFromRequest(request) !== null;
    const hasValidToken = token && reservation.accessToken && token === reservation.accessToken;

    if (!isAdmin && !hasValidToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      ...reservation,
      items: JSON.parse(reservation.items),
      accessToken: undefined,
    });
  } catch (error) {
    console.error("Reservation detail API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getReservationById, updateReservationStatus } from "@/lib/db/reservation-queries";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
type ReservationStatus = (typeof VALID_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const { status } = body as { status: string };

    if (!status || !VALID_STATUSES.includes(status as ReservationStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const reservation = await getReservationById(id);
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const allowedTransitions = VALID_TRANSITIONS[reservation.status] || [];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${reservation.status}' to '${status}'. Allowed: ${allowedTransitions.join(", ") || "none"}`,
        },
        { status: 400 }
      );
    }

    const updated = await updateReservationStatus(id, status as ReservationStatus);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin reservation PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

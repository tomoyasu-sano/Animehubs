import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import {
  getReservationById,
  updateReservationStatus,
} from "@/lib/db/reservation-queries";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
type ReservationStatus = (typeof VALID_STATUSES)[number];

// 許可された状態遷移
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [], // 完了は最終状態
  cancelled: [], // キャンセルも最終状態
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initializeDatabase();

    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // 現在の予約を取得
    const reservation = getReservationById(id);
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // 状態遷移の妥当性チェック
    const allowedTransitions = VALID_TRANSITIONS[reservation.status] || [];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${reservation.status}' to '${status}'. Allowed: ${allowedTransitions.join(", ") || "none"}`,
        },
        { status: 400 }
      );
    }

    const updated = updateReservationStatus(id, status as ReservationStatus);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin reservation PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

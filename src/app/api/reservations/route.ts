import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { createReservation } from "@/lib/db/reservation-queries";
import { validateReservation, type ReservationInput } from "@/lib/validation";
import { sendConfirmationEmail } from "@/lib/email/send-confirmation";
import { checkRateLimit } from "@/lib/rate-limit";

// 1分間に5件まで
const RESERVATION_RATE_LIMIT = 5;
const RESERVATION_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, "reservation", RESERVATION_RATE_LIMIT, RESERVATION_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    initializeDatabase();

    const body = await request.json();

    // バリデーション
    const input: ReservationInput = {
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      location: body.location,
      timeSlot: body.timeSlot,
      items: body.items || [],
      totalAmount: body.totalAmount,
      notes: body.notes,
      locale: body.locale || "en",
    };

    const validationErrors = validateReservation(input);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // 予約作成（在庫確認 + 減算をトランザクションで）
    const result = createReservation({
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      location: input.location,
      timeSlot: input.timeSlot,
      items: input.items,
      totalAmount: input.totalAmount,
      notes: input.notes,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Out of stock",
          outOfStock: result.outOfStock,
        },
        { status: 409 }
      );
    }

    // メール送信（失敗しても予約自体は成功として扱う）
    if (result.reservation) {
      const emailResult = await sendConfirmationEmail({
        reservation: result.reservation,
        locale: input.locale || "en",
      });

      if (!emailResult.ok) {
        console.warn("Confirmation email failed:", emailResult.error);
      }
    }

    return NextResponse.json(
      {
        id: result.reservation?.id,
        accessToken: result.reservation?.accessToken,
        status: result.reservation?.status,
        message: "Reservation created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reservation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

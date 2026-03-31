import { NextRequest, NextResponse } from "next/server";
import { createReservation } from "@/lib/db/reservation-queries";
import { validateReservation, type ReservationInput } from "@/lib/validation";
import { sendConfirmationEmail } from "@/lib/email/send-confirmation";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

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
    const body = await request.json() as Record<string, unknown>;

    const input: ReservationInput = {
      customerName: body.customerName as string,
      customerEmail: body.customerEmail as string,
      location: body.location as string,
      timeSlot: body.timeSlot as string,
      items: (body.items as ReservationInput["items"]) || [],
      totalAmount: body.totalAmount as number,
      notes: body.notes as string | undefined,
      locale: (body.locale as string) || "en",
    };

    const validationErrors = validateReservation(input);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    const result = await createReservation({
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
        { error: "Out of stock", outOfStock: result.outOfStock },
        { status: 409 }
      );
    }

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

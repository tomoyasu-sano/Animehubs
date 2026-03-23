import { Resend } from "resend";
import type { Reservation } from "@/lib/db/schema";
import type { ReservationItemInput } from "@/lib/validation";
import { PICKUP_LOCATIONS, TIME_SLOTS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "AnimeHubs <onboarding@resend.dev>";
const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/animehubs_placeholder";

interface SendConfirmationOptions {
  reservation: Reservation;
  locale: string;
}

function getLocationName(locationId: string, locale: string): string {
  if (locationId === "instagram") {
    return locale === "sv" ? "Via Instagram" : "Via Instagram";
  }
  const loc = PICKUP_LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return locationId;
  return locale === "sv" ? loc.name_sv : loc.name_en;
}

function getTimeSlotName(slotId: string, locale: string): string {
  if (slotId === "instagram") {
    return locale === "sv" ? "Kontakta via Instagram" : "Contact via Instagram";
  }
  const slot = TIME_SLOTS.find((s) => s.id === slotId);
  if (!slot) return slotId;
  return locale === "sv" ? slot.name_sv : slot.name_en;
}

function buildEmailHtml(reservation: Reservation, locale: string): string {
  const items: ReservationItemInput[] = JSON.parse(reservation.items);
  const isSwedish = locale === "sv";

  const locationName = getLocationName(reservation.location, locale);
  const timeSlotName = getTimeSlotName(reservation.timeSlot, locale);

  const title = isSwedish ? "Bokningsbekraftelse" : "Reservation Confirmation";
  const greeting = isSwedish
    ? `Hej ${reservation.customerName}!`
    : `Hi ${reservation.customerName}!`;
  const thankYou = isSwedish
    ? "Tack for din bokning hos AnimeHubs!"
    : "Thank you for your reservation with AnimeHubs!";
  const reservationId = isSwedish ? "Bokningsnummer" : "Reservation ID";
  const orderDetails = isSwedish ? "Orderdetaljer" : "Order Details";
  const pickupInfo = isSwedish ? "Avhamtningsinformation" : "Pickup Information";
  const locationLabel = isSwedish ? "Plats" : "Location";
  const timeLabel = isSwedish ? "Tid" : "Time";
  const totalLabel = isSwedish ? "Totalt" : "Total";
  const contactUs = isSwedish
    ? "Om du har fragor, kontakta oss via Instagram"
    : "If you have any questions, contact us via Instagram";

  const itemsHtml = items
    .map((item) => {
      const name = isSwedish ? item.nameSv : item.nameEn;
      return `<tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${name}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
      </tr>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">AnimeHubs</h1>
        </div>
        <div style="background-color: #ffffff; padding: 32px 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #171717; margin: 0 0 8px;">${title}</h2>
          <p style="color: #737373; margin: 0 0 24px;">${greeting} ${thankYou}</p>

          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #737373;">${reservationId}</p>
            <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold; color: #171717; font-family: monospace;">${reservation.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <h3 style="color: #171717; margin: 0 0 12px; font-size: 16px;">${orderDetails}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            ${itemsHtml}
            <tr>
              <td colspan="2" style="padding: 12px 0; font-weight: bold; color: #171717;">${totalLabel}</td>
              <td style="padding: 12px 0; font-weight: bold; color: #171717; text-align: right;">${formatPrice(reservation.totalAmount)}</td>
            </tr>
          </table>

          <h3 style="color: #171717; margin: 0 0 12px; font-size: 16px;">${pickupInfo}</h3>
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>${locationLabel}:</strong> ${locationName}</p>
            <p style="margin: 0; font-size: 14px;"><strong>${timeLabel}:</strong> ${timeSlotName}</p>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #737373; font-size: 14px; margin: 0 0 12px;">${contactUs}</p>
            <a href="${INSTAGRAM_URL}" style="display: inline-block; background-color: #171717; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Instagram</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendConfirmationEmail({
  reservation,
  locale,
}: SendConfirmationOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    const isSwedish = locale === "sv";
    const subject = isSwedish
      ? `Bokningsbekraftelse - ${reservation.id.slice(0, 8).toUpperCase()}`
      : `Reservation Confirmation - ${reservation.id.slice(0, 8).toUpperCase()}`;

    const html = buildEmailHtml(reservation, locale);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [reservation.customerEmail],
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send confirmation email:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Email sending error:", error);
    return { ok: false, error: "Failed to send email" };
  }
}

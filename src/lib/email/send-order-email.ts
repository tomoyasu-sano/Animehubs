import { Resend } from "resend";
import { formatPrice } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/db/schema";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AnimeHubs <onboarding@resend.dev>";
const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  "https://www.instagram.com/animehubs_swe/";

function buildOrderEmailHtml(order: Order, items: OrderItem[]): string {
  const isDelivery = order.type === "delivery";

  const itemsHtml = items
    .map(
      (item) => `<tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${escapeHtml(item.name_en)}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const shippingHtml = isDelivery && order.shippingAddress
    ? (() => {
        const addr = JSON.parse(order.shippingAddress) as {
          full_name: string;
          street: string;
          city: string;
          postal_code: string;
        };
        return `
          <h3 style="color: #171717; margin: 0 0 12px; font-size: 16px;">Shipping Address</h3>
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 14px;">${escapeHtml(addr.full_name)}</p>
            <p style="margin: 0 0 4px; font-size: 14px;">${escapeHtml(addr.street)}</p>
            <p style="margin: 0; font-size: 14px;">${escapeHtml(addr.postal_code)} ${escapeHtml(addr.city)}</p>
          </div>`;
      })()
    : "";

  const inspectionHtml = !isDelivery
    ? `<div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; font-weight: bold; color: #92400e;">In-Person Inspection</p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #92400e;">Please contact us via Instagram DM to arrange a meeting.</p>
        <p style="margin: 0; font-size: 14px; color: #92400e;">Deadline: ${order.expiresAt ? new Date(order.expiresAt).toLocaleDateString("en-SE") : "7 days"}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">AnimeHubs</h1>
    </div>
    <div style="background-color: #ffffff; padding: 32px 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
      <h2 style="color: #171717; margin: 0 0 8px;">Order Confirmation</h2>
      <p style="color: #737373; margin: 0 0 24px;">Hi ${escapeHtml(order.customerName)}! Thank you for your order.</p>

      <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #737373;">Order Number</p>
        <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold; color: #171717; font-family: monospace;">${order.orderNumber}</p>
      </div>

      ${inspectionHtml}

      <h3 style="color: #171717; margin: 0 0 12px; font-size: 16px;">Order Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${itemsHtml}
        <tr>
          <td colspan="2" style="padding: 12px 0; font-weight: bold; color: #171717;">Total</td>
          <td style="padding: 12px 0; font-weight: bold; color: #171717; text-align: right;">${formatPrice(order.totalAmount)}</td>
        </tr>
      </table>

      ${shippingHtml}

      <div style="text-align: center; margin-top: 32px;">
        <p style="color: #737373; font-size: 14px; margin: 0 0 12px;">Questions? Contact us on Instagram</p>
        <a href="${INSTAGRAM_URL}" style="display: inline-block; background-color: #171717; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(
  order: Order,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const items: OrderItem[] = JSON.parse(order.items);
    const html = buildOrderEmailHtml(order, items);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [order.customerEmail],
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
    });

    if (error) {
      console.error("Failed to send order confirmation email:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Order email sending error:", error);
    return { ok: false, error: "Failed to send email" };
  }
}

export async function sendAdminNewOrderEmail(
  order: Order,
  adminEmails: readonly string[],
): Promise<void> {
  try {
    const items: OrderItem[] = JSON.parse(order.items);
    const itemsSummary = items
      .map((i) => `${i.name_en} x${i.quantity}`)
      .join(", ");

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [...adminEmails],
      subject: `[AnimeHubs] New Order: ${order.orderNumber}`,
      html: `<p>New ${order.type} order received.</p>
<p><strong>Order:</strong> ${order.orderNumber}</p>
<p><strong>Customer:</strong> ${order.customerName} (${order.customerEmail})</p>
<p><strong>Items:</strong> ${itemsSummary}</p>
<p><strong>Total:</strong> ${formatPrice(order.totalAmount)}</p>`,
    });
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
}

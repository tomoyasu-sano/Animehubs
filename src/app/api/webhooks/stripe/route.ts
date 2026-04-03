import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  getOrderByCheckoutSessionId,
  updateOrderStatus,
  releaseReservedStock,
  confirmStockDeduction,
} from "@/lib/db/order-queries";
import {
  sendOrderConfirmationEmail,
  sendAdminNewOrderEmail,
} from "@/lib/email/send-order-email";
import { ADMIN_EMAILS } from "@/lib/constants";
import type { OrderItem } from "@/lib/db/schema";
import type Stripe from "stripe";

async function verifyWebhookSignature(
  request: Request,
): Promise<Stripe.Event | null> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return null;
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("Missing stripe-signature header");
    return null;
  }

  try {
    // Cloudflare Workers では Node.js crypto が使えないため async 版を使用
    return await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return null;
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const order = await getOrderByCheckoutSessionId(session.id);
  if (!order) {
    console.error(
      `Order not found for checkout session: ${session.id}`,
    );
    return;
  }

  // べき等チェック: 既に paid 以上なら処理済み
  if (order.status !== "pending_payment" && order.status !== "reserved") {
    console.log(
      `Order ${order.orderNumber} already processed (status: ${order.status})`,
    );
    return;
  }

  const items: OrderItem[] = JSON.parse(order.items);

  const extra: Record<string, string> = {
    stripePaymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? "",
  };

  if (order.status === "reserved") {
    // 予約注文の Pay Now: reserved → paid
    // reserved_stock は既に確保済み。stock から確定減算のみ行う
    await confirmStockDeduction(items);
  } else {
    // 通常注文: pending_payment → paid
    await confirmStockDeduction(items);
  }

  await updateOrderStatus(order.id, "paid", extra);

  // メール送信
  const updatedOrder = { ...order, status: "paid" };
  try {
    const emailResult = await sendOrderConfirmationEmail(updatedOrder);
    if (!emailResult.ok) {
      console.error("Order confirmation email failed:", emailResult.error);
    }
  } catch (err) {
    console.error("Failed to send order confirmation:", err);
  }
  try {
    await sendAdminNewOrderEmail(updatedOrder, ADMIN_EMAILS);
  } catch (err) {
    console.error("Failed to send admin notification:", err);
  }
}

async function handlePaymentFailed(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const order = await getOrderByCheckoutSessionId(session.id);
  if (!order) return;

  // reserved 注文の Stripe Session 期限切れは無視（予約自体は有効のまま）
  if (order.status === "reserved") return;

  if (order.status !== "pending_payment") return;

  const items: OrderItem[] = JSON.parse(order.items);
  await releaseReservedStock(items);
  await updateOrderStatus(order.id, "payment_failed");
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
): Promise<void> {
  // payment_intent から注文を逆引き
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  // checkout session ID ではなく payment_intent_id で検索が必要
  // → 現在のDBスキーマでは stripePaymentIntentId で検索
  const { getDb } = await import("@/lib/db");
  const { orders } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();

  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.stripePaymentIntentId, paymentIntentId))
    .get();

  if (!order) {
    console.error(
      `Order not found for payment intent: ${paymentIntentId}`,
    );
    return;
  }

  if (order.status === "cancelled") return;

  await updateOrderStatus(order.id, "cancelled", {
    cancelledReason: "refunded",
  });
}

export async function POST(request: Request) {
  const event = await verifyWebhookSignature(request);
  if (!event) {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handlePaymentFailed(session);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

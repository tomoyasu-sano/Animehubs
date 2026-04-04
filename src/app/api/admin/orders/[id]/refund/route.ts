import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { stripe } from "@/lib/stripe";
import { updateOrderStatus, restoreStock } from "@/lib/db/order-queries";
import { sendOrderCancellationEmail } from "@/lib/email/send-order-email";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { OrderItem } from "@/lib/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .get();

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    // 返金可能なステータスのみ
    const refundableStatuses = ["pending_inspection", "paid"];
    if (!refundableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot refund order with status '${order.status}'` },
        { status: 400 },
      );
    }

    if (!order.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No payment intent found for this order" },
        { status: 400 },
      );
    }

    // ステータスを先に cancelled に更新（二重返金防止）
    // 後続処理が失敗してもステータスが cancelled なので再実行時にガードされる
    await updateOrderStatus(id, "cancelled", {
      cancelledReason: "admin_refund",
    });

    // Stripe 返金
    try {
      await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
      });
    } catch (stripeError) {
      // Stripe 返金失敗時はステータスを戻して再試行可能にする
      console.error("Stripe refund failed, reverting status:", stripeError);
      await updateOrderStatus(id, order.status);
      return NextResponse.json(
        { error: "Stripe refund failed. Please try again." },
        { status: 502 },
      );
    }

    // 在庫復元
    const items: OrderItem[] = JSON.parse(order.items);
    await restoreStock(items);

    // 顧客にキャンセルメール
    const cancelledOrder = { ...order, status: "cancelled" };
    sendOrderCancellationEmail(cancelledOrder).catch((err) =>
      console.error("Failed to send cancellation email:", err),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to refund order:", error);
    return NextResponse.json(
      { error: "Refund failed" },
      { status: 500 },
    );
  }
}

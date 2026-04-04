import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { stripe } from "@/lib/stripe";
import {
  getOrderByCheckoutSessionId,
  updateOrderStatus,
  releaseReservedStock,
} from "@/lib/db/order-queries";
import type { OrderItem } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { sessionId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { sessionId } = body;
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    const order = await getOrderByCheckoutSessionId(sessionId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    // 自分の注文のみキャンセル可能
    if (order.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    // pending_payment 以外はキャンセル不要
    if (order.status !== "pending_payment") {
      return NextResponse.json({ ok: true, alreadyHandled: true });
    }

    // Stripe Session を expire
    try {
      await stripe.checkout.sessions.expire(sessionId);
    } catch {
      // 既に期限切れ or 完了済みの場合は無視
    }

    // 在庫仮押さえ解除
    const items: OrderItem[] = JSON.parse(order.items);
    await releaseReservedStock(items);

    // 注文ステータスを cancelled に
    await updateOrderStatus(order.id, "cancelled", {
      cancelledReason: "customer_cancelled",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to cancel checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

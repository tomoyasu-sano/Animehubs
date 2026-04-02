import { NextResponse } from "next/server";
import { getOrderByCheckoutSessionId } from "@/lib/db/order-queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    // Stripe session ID フォーマット検証
    if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session_id" },
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

    // 最小限の情報のみ返す（メールアドレスはマスク）
    const maskedEmail = order.customerEmail.replace(
      /^(.{2}).*(@.*)$/,
      "$1***$2",
    );

    return NextResponse.json({
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items,
      shippingAddress: order.shippingAddress,
      customerName: order.customerName,
      customerEmail: maskedEmail,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { stripe } from "@/lib/stripe";
import { createOrder, checkAvailableStock, getOrderById, updateOrderStatus } from "@/lib/db/order-queries";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  CURRENCY,
  FREE_SHIPPING_THRESHOLD_ORE,
  SHIPPING_FEE_ORE,
} from "@/lib/constants";
import type { OrderItem, OrderType, SwedishAddress } from "@/lib/db/schema";
import { parseImages } from "@/lib/utils";

interface CartItem {
  productId: string;
  quantity: number;
}

interface CreateSessionRequest {
  items?: CartItem[];
  type?: OrderType;
  email?: string;
  shippingAddress?: SwedishAddress;
  orderId?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateRequest(body: unknown): {
  ok: boolean;
  data?: CreateSessionRequest;
  error?: string;
} {
  const req = body as CreateSessionRequest;

  // orderId パターン: 既存の reserved 注文から Pay Now
  if (req.orderId) {
    if (!UUID_RE.test(req.orderId)) {
      return { ok: false, error: "Invalid orderId" };
    }
    return { ok: true, data: req };
  }

  // 通常パターン: カートから新規注文
  if (!req.items || !Array.isArray(req.items) || req.items.length === 0) {
    return { ok: false, error: "items is required and must be a non-empty array" };
  }

  if (req.items.length > 20) {
    return { ok: false, error: "Too many items (max 20)" };
  }

  for (const item of req.items) {
    if (!item.productId || !UUID_RE.test(item.productId)) {
      return { ok: false, error: "Invalid productId" };
    }
    if (
      !item.quantity ||
      typeof item.quantity !== "number" ||
      item.quantity < 1 ||
      item.quantity > 10
    ) {
      return { ok: false, error: "Invalid quantity (1-10)" };
    }
  }

  if (req.type !== "delivery" && req.type !== "inspection") {
    return { ok: false, error: "type must be 'delivery' or 'inspection'" };
  }

  if (req.type === "delivery") {
    if (!req.shippingAddress) {
      return { ok: false, error: "shippingAddress is required for delivery" };
    }
    const addr = req.shippingAddress;
    if (
      !addr.full_name?.trim() ||
      !addr.street?.trim() ||
      !addr.city?.trim() ||
      !addr.postal_code?.trim()
    ) {
      return { ok: false, error: "All address fields are required" };
    }
    if (!/^\d{3}\s?\d{2}$/.test(addr.postal_code)) {
      return { ok: false, error: "Invalid Swedish postal code (format: NNN NN)" };
    }
  }

  return { ok: true, data: req };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const validation = validateRequest(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const { orderId, items, type, email: requestEmail, shippingAddress } = validation.data!;

    // リクエストの Origin/Referer からベースURL・ロケールを取得
    const origin = request.headers.get("origin");
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      origin ||
      "http://localhost:8787";
    const referer = request.headers.get("referer") || "";
    const localeMatch = referer.match(/\/(en|sv)\//);
    const locale = localeMatch ? localeMatch[1] : "en";

    // ─── orderId パターン: 既存 reserved 注文から Pay Now ───
    if (orderId) {
      const existingOrder = await getOrderById(orderId);
      if (!existingOrder) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 },
        );
      }
      if (existingOrder.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 },
        );
      }
      if (existingOrder.status !== "reserved") {
        return NextResponse.json(
          { error: "Order is not in reserved status" },
          { status: 400 },
        );
      }
      // 期限切れチェック
      if (existingOrder.expiresAt && new Date(existingOrder.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "Reservation has expired" },
          { status: 410 },
        );
      }

      // 既存の Stripe Session があれば expire してから新規作成
      if (existingOrder.stripeCheckoutSessionId) {
        await stripe.checkout.sessions
          .expire(existingOrder.stripeCheckoutSessionId)
          .catch(() => {});
      }

      const orderItems: OrderItem[] = JSON.parse(existingOrder.items);
      const lineItems = orderItems.map((item) => ({
        price_data: {
          currency: CURRENCY.toLowerCase(),
          product_data: {
            name: item.name_en,
            images: item.image && item.image.startsWith("http") ? [item.image] : undefined,
          },
          unit_amount: item.price,
        },
        quantity: item.quantity,
      }));

      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        currency: CURRENCY.toLowerCase(),
        line_items: lineItems,
        customer_email: existingOrder.customerEmail || undefined,
        expires_at: expiresAt,
        success_url: `${baseUrl}/${locale}/orders/${existingOrder.id}?payment=success`,
        cancel_url: `${baseUrl}/${locale}/orders/${existingOrder.id}`,
        metadata: {
          order_type: "inspection",
          user_id: session.user.id,
          order_id: existingOrder.id,
        },
      });

      // 注文に Stripe Session ID を紐付け
      const db = await getDb();
      const { orders } = await import("@/lib/db/schema");
      await db
        .update(orders)
        .set({
          stripeCheckoutSessionId: checkoutSession.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orders.id, existingOrder.id))
        .run();

      return NextResponse.json({
        sessionId: checkoutSession.id,
        sessionUrl: checkoutSession.url,
      });
    }

    // ─── 通常パターン: カートから新規注文 ───
    const customerEmail = requestEmail?.trim() || session.user.email || "";

    // 商品情報をDBから取得
    const db = await getDb();
    const orderItems: OrderItem[] = [];

    for (const cartItem of items!) {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, cartItem.productId))
        .get();

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${cartItem.productId}` },
          { status: 400 },
        );
      }

      orderItems.push({
        product_id: product.id,
        name_en: product.nameEn,
        name_sv: product.nameSv,
        price: product.price,
        quantity: cartItem.quantity,
        image: parseImages(product.images)[0] ?? "",
      });
    }

    // 在庫チェック
    const stockCheck = await checkAvailableStock(
      orderItems.map((i) => ({
        productId: i.product_id,
        name: i.name_en,
        quantity: i.quantity,
      })),
    );

    if (!stockCheck.ok) {
      return NextResponse.json(
        { error: "Out of stock", details: stockCheck.outOfStock },
        { status: 409 },
      );
    }

    // 合計金額計算（öre単位）
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const needsShipping =
      type === "delivery" && subtotal < FREE_SHIPPING_THRESHOLD_ORE;
    const shippingFee = needsShipping ? SHIPPING_FEE_ORE : 0;
    const totalAmount = subtotal + shippingFee;

    // Stripe line_items 構築
    const lineItems = orderItems.map((item) => ({
      price_data: {
        currency: CURRENCY.toLowerCase(),
        product_data: {
          name: item.name_en,
          images: item.image && item.image.startsWith("http") ? [item.image] : undefined,
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    if (needsShipping) {
      lineItems.push({
        price_data: {
          currency: CURRENCY.toLowerCase(),
          product_data: {
            name: "Shipping fee",
            images: undefined,
          },
          unit_amount: SHIPPING_FEE_ORE,
        },
        quantity: 1,
      });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30分後

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: CURRENCY.toLowerCase(),
      line_items: lineItems,
      customer_email: customerEmail || undefined,
      expires_at: expiresAt,
      success_url: `${baseUrl}/${locale}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${locale}/cart`,
      metadata: {
        order_type: type!,
        user_id: session.user.id,
      },
    });

    // 注文レコード作成 + 在庫仮押さえ
    const orderResult = await createOrder({
      userId: session.user.id,
      customerName: shippingAddress?.full_name || session.user.name || "",
      customerEmail: customerEmail,
      type: type!,
      items: orderItems,
      totalAmount,
      shippingAddress: type === "delivery" ? shippingAddress : undefined,
      stripeCheckoutSessionId: checkoutSession.id,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });

    if (!orderResult.ok) {
      // Stripe Session を無効化して孤立セッションを防止
      await stripe.checkout.sessions.expire(checkoutSession.id).catch(() => {});
      return NextResponse.json(
        { error: "Out of stock", details: orderResult.outOfStock },
        { status: 409 },
      );
    }

    return NextResponse.json({
      sessionId: checkoutSession.id,
      sessionUrl: checkoutSession.url,
    });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

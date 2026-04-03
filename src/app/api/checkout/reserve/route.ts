import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  countActiveReservations,
  createReservationOrder,
} from "@/lib/db/order-queries";
import { sendReservationConfirmationEmail, sendAdminNewOrderEmail } from "@/lib/email/send-order-email";
import { MAX_ACTIVE_RESERVATIONS, ADMIN_EMAILS } from "@/lib/constants";
import type { OrderItem } from "@/lib/db/schema";

interface CartItem {
  productId: string;
  quantity: number;
}

interface ReserveRequest {
  items: CartItem[];
  email?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateRequest(body: unknown): {
  ok: boolean;
  data?: ReserveRequest;
  error?: string;
} {
  const req = body as ReserveRequest;

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

    const { items, email: requestEmail } = validation.data!;
    const customerEmail = requestEmail?.trim() || session.user.email || "";

    // 重複予約チェック
    const activeCount = await countActiveReservations(session.user.id);
    if (activeCount >= MAX_ACTIVE_RESERVATIONS) {
      return NextResponse.json(
        { error: `Too many active reservations (max ${MAX_ACTIVE_RESERVATIONS})` },
        { status: 429 },
      );
    }

    // 商品情報をDBから取得
    const db = await getDb();
    const orderItems: OrderItem[] = [];

    for (const cartItem of items) {
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
        image: JSON.parse(product.images)[0] ?? "",
      });
    }

    // 合計金額（送料なし）
    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // 予約注文作成 + 在庫仮押さえ
    const result = await createReservationOrder({
      userId: session.user.id,
      customerName: session.user.name || "",
      customerEmail,
      items: orderItems,
      totalAmount,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Out of stock", details: result.outOfStock },
        { status: 409 },
      );
    }

    // 確認メール送信
    if (result.order) {
      const referer = request.headers.get("referer") || "";
      const localeMatch = referer.match(/\/(en|sv)\//);
      const locale = localeMatch ? localeMatch[1] : "en";
      const origin = request.headers.get("origin");
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:8787";
      const orderPageUrl = `${baseUrl}/${locale}/orders/${result.order.id}`;

      // 購入者に予約確認メール
      try {
        const emailResult = await sendReservationConfirmationEmail(result.order, orderPageUrl);
        if (!emailResult.ok) {
          console.error("Reservation email failed:", emailResult.error);
        }
      } catch (err) {
        console.error("Failed to send reservation email:", err);
      }
      // 管理者に新規予約通知メール
      try {
        await sendAdminNewOrderEmail(result.order, ADMIN_EMAILS);
      } catch (err) {
        console.error("Failed to send admin reservation notification:", err);
      }
    }

    return NextResponse.json({
      orderId: result.order!.id,
      orderNumber: result.order!.orderNumber,
    });
  } catch (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

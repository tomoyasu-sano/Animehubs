import { getDb } from "./index";
import { products, orders } from "./schema";
import { eq, sql, count, and, lt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Order, OrderType, OrderItem, SwedishAddress } from "./schema";

export interface CreateOrderInput {
  userId: string;
  customerName: string;
  customerEmail: string;
  type: OrderType;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress?: SwedishAddress;
  stripeCheckoutSessionId: string;
  expiresAt?: string;
}

export interface StockCheckResult {
  ok: boolean;
  outOfStock: {
    productId: string;
    name: string;
    requested: number;
    available: number;
  }[];
}

/**
 * 実在庫（stock - reserved_stock）をチェック
 */
export async function checkAvailableStock(
  items: { productId: string; name: string; quantity: number }[],
): Promise<StockCheckResult> {
  const db = await getDb();
  const outOfStock: StockCheckResult["outOfStock"] = [];

  for (const item of items) {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .get();

    if (!product) {
      outOfStock.push({
        productId: item.productId,
        name: item.name,
        requested: item.quantity,
        available: 0,
      });
      continue;
    }

    const available = product.stock - product.reservedStock;
    if (available < item.quantity) {
      outOfStock.push({
        productId: item.productId,
        name: product.nameEn,
        requested: item.quantity,
        available,
      });
    }
  }

  return { ok: outOfStock.length === 0, outOfStock };
}

/**
 * 当日の注文連番を取得して注文番号を生成
 * 形式: AH-YYYYMMDD-NNNN
 */
async function generateOrderNumber(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<{ orderNumber: string; orderDate: string; orderSeq: number }> {
  const now = new Date();
  const orderDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  const result = await db
    .select({ cnt: count() })
    .from(orders)
    .where(eq(orders.orderDate, orderDate))
    .get();

  const orderSeq = (result?.cnt ?? 0) + 1;
  const orderNumber = `AH-${orderDate}-${String(orderSeq).padStart(4, "0")}`;

  return { orderNumber, orderDate, orderSeq };
}

/**
 * 注文作成 + 在庫仮押さえ（reserved_stock +1）
 */
export async function createOrder(input: CreateOrderInput): Promise<{
  ok: boolean;
  order?: Order;
  outOfStock?: StockCheckResult["outOfStock"];
}> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  // 在庫チェック（batch前に実施）
  const stockCheck = await checkAvailableStock(
    input.items.map((i) => ({
      productId: i.product_id,
      name: i.name_en,
      quantity: i.quantity,
    })),
  );

  if (!stockCheck.ok) {
    return { ok: false, outOfStock: stockCheck.outOfStock };
  }

  const { orderNumber, orderDate, orderSeq } = await generateOrderNumber(db);

  // 条件付き UPDATE: stock - reserved_stock >= quantity の場合のみ reserved_stock をインクリメント
  // TOCTOU 防止: WHERE 句で在庫を原子的にチェック
  const stockUpdates = input.items.map((item) =>
    db
      .update(products)
      .set({
        reservedStock: sql`${products.reservedStock} + ${item.quantity}`,
        updatedAt: now,
      })
      .where(
        sql`${products.id} = ${item.product_id} AND (${products.stock} - ${products.reservedStock}) >= ${item.quantity}`,
      ),
  );

  const insertOrder = db.insert(orders).values({
    id,
    orderNumber,
    orderDate,
    orderSeq,
    userId: input.userId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    type: input.type,
    status: "pending_payment",
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    totalAmount: input.totalAmount,
    items: JSON.stringify(input.items),
    shippingAddress: input.shippingAddress
      ? JSON.stringify(input.shippingAddress)
      : null,
    expiresAt: input.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await db.batch([...stockUpdates, insertOrder] as [typeof insertOrder]);

  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  return { ok: true, order };
}

/**
 * Stripe Checkout Session ID で注文を検索
 */
export async function getOrderByCheckoutSessionId(
  sessionId: string,
): Promise<Order | undefined> {
  const db = await getDb();
  return db
    .select()
    .from(orders)
    .where(eq(orders.stripeCheckoutSessionId, sessionId))
    .get();
}

/**
 * 注文ステータスを更新
 */
export async function updateOrderStatus(
  id: string,
  status: string,
  extra?: Partial<{
    stripePaymentIntentId: string;
    cancelledReason: string;
    notes: string;
    expiresAt: string;
  }>,
): Promise<Order | undefined> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db
    .update(orders)
    .set({
      status,
      updatedAt: now,
      ...extra,
    })
    .where(eq(orders.id, id))
    .run();

  return db.select().from(orders).where(eq(orders.id, id)).get();
}

/**
 * 在庫仮押さえ解除（reserved_stock -1）
 */
export async function releaseReservedStock(
  items: OrderItem[],
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const updates = items.map((item) =>
    db
      .update(products)
      .set({
        reservedStock: sql`MAX(${products.reservedStock} - ${item.quantity}, 0)`,
        updatedAt: now,
      })
      .where(eq(products.id, item.product_id)),
  );

  if (updates.length > 0) {
    await db.batch(updates as [typeof updates[0]]);
  }
}

/**
 * 在庫確定減算（stock -1, reserved_stock -1）
 */
export async function confirmStockDeduction(
  items: OrderItem[],
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const updates = items.map((item) =>
    db
      .update(products)
      .set({
        stock: sql`MAX(${products.stock} - ${item.quantity}, 0)`,
        reservedStock: sql`MAX(${products.reservedStock} - ${item.quantity}, 0)`,
        updatedAt: now,
      })
      .where(eq(products.id, item.product_id)),
  );

  if (updates.length > 0) {
    await db.batch(updates as [typeof updates[0]]);
  }
}

/**
 * 在庫復元（stock +N）— キャンセル・返金時に使用
 */
export async function restoreStock(items: OrderItem[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const updates = items.map((item) =>
    db
      .update(products)
      .set({
        stock: sql`${products.stock} + ${item.quantity}`,
        updatedAt: now,
      })
      .where(eq(products.id, item.product_id)),
  );

  if (updates.length > 0) {
    await db.batch(updates as [typeof updates[0]]);
  }
}

/**
 * 期限切れの pending_inspection 注文を取得
 */
export async function getExpiredInspectionOrders(): Promise<Order[]> {
  const db = await getDb();
  const now = new Date().toISOString();

  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.type, "inspection"),
        eq(orders.status, "reserved"),
        lt(orders.expiresAt, now),
      ),
    )
    .all();
}

/**
 * ユーザーのアクティブ予約数をカウント
 */
export async function countActiveReservations(
  userId: string,
): Promise<number> {
  const db = await getDb();
  const result = await db
    .select({ cnt: count() })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.type, "inspection"),
        eq(orders.status, "reserved"),
      ),
    )
    .get();
  return result?.cnt ?? 0;
}

/**
 * 予約注文作成（Stripe決済なし、在庫仮押さえのみ）
 */
export async function createReservationOrder(input: {
  userId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
}): Promise<{
  ok: boolean;
  order?: Order;
  outOfStock?: StockCheckResult["outOfStock"];
}> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  const stockCheck = await checkAvailableStock(
    input.items.map((i) => ({
      productId: i.product_id,
      name: i.name_en,
      quantity: i.quantity,
    })),
  );

  if (!stockCheck.ok) {
    return { ok: false, outOfStock: stockCheck.outOfStock };
  }

  const { orderNumber, orderDate, orderSeq } = await generateOrderNumber(db);

  // TOCTOU防止: 条件付きUPDATEで在庫を原子的にチェック
  const stockUpdates = input.items.map((item) =>
    db
      .update(products)
      .set({
        reservedStock: sql`${products.reservedStock} + ${item.quantity}`,
        updatedAt: now,
      })
      .where(
        sql`${products.id} = ${item.product_id} AND (${products.stock} - ${products.reservedStock}) >= ${item.quantity}`,
      ),
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const insertOrder = db.insert(orders).values({
    id,
    orderNumber,
    orderDate,
    orderSeq,
    userId: input.userId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    type: "inspection",
    status: "reserved",
    totalAmount: input.totalAmount,
    items: JSON.stringify(input.items),
    expiresAt: expiresAt.toISOString(),
    createdAt: now,
    updatedAt: now,
  });

  await db.batch([...stockUpdates, insertOrder] as [typeof insertOrder]);

  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .get();

  return { ok: true, order };
}

/**
 * 注文IDで検索
 */
export async function getOrderById(id: string): Promise<Order | undefined> {
  const db = await getDb();
  return db.select().from(orders).where(eq(orders.id, id)).get();
}

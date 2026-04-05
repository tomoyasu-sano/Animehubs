import { getDb } from "./index";
import { products, reservations, orders } from "./schema";
import { eq, like, and, or, sql, desc, asc, gte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Product, NewProduct, Reservation, Order } from "./schema";

// ==================== 商品管理 ====================

interface AdminGetProductsOptions {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export async function adminGetProducts(options: AdminGetProductsOptions = {}): Promise<{
  items: Product[];
  total: number;
}> {
  const db = await getDb();
  const conditions = [];

  if (options.category) {
    conditions.push(eq(products.category, options.category));
  }

  if (options.search) {
    const searchTerm = `%${options.search}%`;
    conditions.push(
      or(
        like(products.nameEn, searchTerm),
        like(products.nameSv, searchTerm)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause)
    .get();

  const total = countResult?.count || 0;

  let query = db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(desc(products.createdAt));

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  const items = await query.all();
  return { items, total };
}

export async function createProduct(
  input: Omit<NewProduct, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  await db.insert(products)
    .values({ id, ...input, createdAt: now, updatedAt: now })
    .run();

  return (await db.select().from(products).where(eq(products.id, id)).get())!;
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt">>
): Promise<Product | undefined> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.select().from(products).where(eq(products.id, id)).get();
  if (!existing) return undefined;

  await db.update(products)
    .set({ ...input, updatedAt: now })
    .where(eq(products.id, id))
    .run();

  return db.select().from(products).where(eq(products.id, id)).get();
}

export async function deleteProduct(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.select().from(products).where(eq(products.id, id)).get();
  if (!existing) return false;

  await db.delete(products).where(eq(products.id, id)).run();
  return true;
}

// ==================== 予約管理 ====================

interface AdminGetReservationsOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function adminGetReservations(
  options: AdminGetReservationsOptions = {}
): Promise<{ items: Reservation[]; total: number }> {
  const db = await getDb();
  const conditions = [];

  if (options.status) {
    conditions.push(eq(reservations.status, options.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(reservations)
    .where(whereClause)
    .get();

  const total = countResult?.count || 0;

  let query = db
    .select()
    .from(reservations)
    .where(whereClause)
    .orderBy(desc(reservations.createdAt));

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  const items = await query.all();
  return { items, total };
}

// ==================== 注文管理 ====================

interface AdminGetOrdersOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function adminGetOrders(
  options: AdminGetOrdersOptions = {}
): Promise<{ items: Order[]; total: number }> {
  const db = await getDb();
  const conditions = [];

  if (options.status) {
    conditions.push(eq(orders.status, options.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(whereClause)
    .get();

  const total = countResult?.count || 0;

  let query = db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt));

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  const items = await query.all();
  return { items, total };
}

// ==================== ダッシュボード ====================

export interface PopularProduct {
  id: string;
  nameEn: string;
  nameSv: string;
  category: string;
  price: number;
  stock: number;
  likesCount: number;
  images: string;
}

export interface DashboardStats {
  totalProducts: number;
  // レガシー予約 (reservations)
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  recentReservations: Reservation[];
  // 新規注文 (orders)
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  completedOrders: number;
  recentOrders: Order[];
  // 統合集計
  totalRevenue: number;
  salesByCategory: { category: string; total: number; count: number }[];
  salesByMonth: { month: string; total: number; count: number }[];
  // いいねランキング
  popularProducts: PopularProduct[];
}

async function countWhere(
  db: Awaited<ReturnType<typeof getDb>>,
  table: typeof reservations | typeof orders,
  statusField: typeof reservations.status | typeof orders.status,
  statusValue: string,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(eq(statusField, statusValue))
    .get();
  return result?.count || 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();

  const totalProducts =
    (await db.select({ count: sql<number>`count(*)` }).from(products).get())?.count || 0;

  // --- レガシー予約 (reservations) ---
  const totalReservations =
    (await db.select({ count: sql<number>`count(*)` }).from(reservations).get())?.count || 0;
  const pendingReservations = await countWhere(db, reservations, reservations.status, "pending");
  const confirmedReservations = await countWhere(db, reservations, reservations.status, "confirmed");
  const completedReservations = await countWhere(db, reservations, reservations.status, "completed");

  const recentReservations = await db
    .select()
    .from(reservations)
    .orderBy(desc(reservations.createdAt))
    .limit(5)
    .all();

  // --- 新規注文 (orders) ---
  const totalOrders =
    (await db.select({ count: sql<number>`count(*)` }).from(orders).get())?.count || 0;
  const pendingOrders = await countWhere(db, orders, orders.status, "pending_payment");
  const paidOrders = await countWhere(db, orders, orders.status, "paid");
  const shippedOrders = await countWhere(db, orders, orders.status, "shipped");
  const completedOrders = await countWhere(db, orders, orders.status, "completed");

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5)
    .all();

  // --- 売上集計（reservations + orders 統合） ---
  const reservationRevenue =
    (
      await db
        .select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` })
        .from(reservations)
        .where(or(eq(reservations.status, "confirmed"), eq(reservations.status, "completed")))
        .get()
    )?.total || 0;

  const orderRevenue =
    (
      await db
        .select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` })
        .from(orders)
        .where(or(
          eq(orders.status, "paid"),
          eq(orders.status, "shipped"),
          eq(orders.status, "completed"),
        ))
        .get()
    )?.total || 0;

  const totalRevenue = reservationRevenue + orderRevenue;

  // カテゴリ別・月別集計（reservations + orders）
  const categoryMap = new Map<string, { total: number; count: number }>();
  const monthMap = new Map<string, { total: number; count: number }>();

  // 商品カテゴリを一括取得して Map に格納（N+1 クエリ回避）
  const allProducts = await db
    .select({ id: products.id, category: products.category })
    .from(products)
    .all();
  const productCategoryMap = new Map(allProducts.map((p) => [p.id, p.category]));

  // reservations の集計
  const paidReservations = await db
    .select()
    .from(reservations)
    .where(or(eq(reservations.status, "confirmed"), eq(reservations.status, "completed")))
    .all();

  for (const r of paidReservations) {
    // 月別
    const month = r.createdAt.substring(0, 7);
    const mExisting = monthMap.get(month) || { total: 0, count: 0 };
    monthMap.set(month, { total: mExisting.total + r.totalAmount, count: mExisting.count + 1 });

    // カテゴリ別
    try {
      const items = JSON.parse(r.items) as { productId: string; quantity: number; price: number }[];
      for (const item of items) {
        const cat = productCategoryMap.get(item.productId) || "unknown";
        const existing = categoryMap.get(cat) || { total: 0, count: 0 };
        categoryMap.set(cat, {
          total: existing.total + item.price * item.quantity,
          count: existing.count + item.quantity,
        });
      }
    } catch {
      // JSON パースエラーは無視
    }
  }

  // orders の集計
  const paidOrdersList = await db
    .select()
    .from(orders)
    .where(or(
      eq(orders.status, "paid"),
      eq(orders.status, "shipped"),
      eq(orders.status, "completed"),
    ))
    .all();

  for (const o of paidOrdersList) {
    // 月別
    const month = o.createdAt.substring(0, 7);
    const mExisting = monthMap.get(month) || { total: 0, count: 0 };
    monthMap.set(month, { total: mExisting.total + o.totalAmount, count: mExisting.count + 1 });

    // カテゴリ別
    try {
      const items = JSON.parse(o.items) as { product_id: string; quantity: number; price: number }[];
      for (const item of items) {
        const cat = productCategoryMap.get(item.product_id) || "unknown";
        const existing = categoryMap.get(cat) || { total: 0, count: 0 };
        categoryMap.set(cat, {
          total: existing.total + item.price * item.quantity,
          count: existing.count + item.quantity,
        });
      }
    } catch {
      // JSON パースエラーは無視
    }
  }

  const salesByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    total: data.total,
    count: data.count,
  }));

  const salesByMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, total: data.total, count: data.count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // いいねランキング TOP10
  const popularProducts: PopularProduct[] = await db
    .select({
      id: products.id,
      nameEn: products.nameEn,
      nameSv: products.nameSv,
      category: products.category,
      price: products.price,
      stock: products.stock,
      likesCount: products.likesCount,
      images: products.images,
    })
    .from(products)
    .orderBy(desc(products.likesCount))
    .limit(10)
    .all();

  return {
    totalProducts,
    totalReservations,
    pendingReservations,
    confirmedReservations,
    completedReservations,
    recentReservations,
    totalOrders,
    pendingOrders,
    paidOrders,
    shippedOrders,
    completedOrders,
    recentOrders,
    totalRevenue,
    salesByCategory,
    salesByMonth,
    popularProducts,
  };
}

// ==================== ニュースレター用商品取得 ====================

/**
 * 直近N日以内に作成された商品を取得する（UTC基準）。
 */
export async function getRecentProducts(
  days: number,
): Promise<
  Array<{
    id: string;
    nameEn: string;
    price: number;
    images: string;
  }>
> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  return db
    .select({
      id: products.id,
      nameEn: products.nameEn,
      price: products.price,
      images: products.images,
    })
    .from(products)
    .where(gte(products.createdAt, since))
    .orderBy(desc(products.createdAt))
    .all();
}

// ==================== Featured商品並び替え ====================

export async function getFeaturedProducts(): Promise<Product[]> {
  const db = await getDb();
  return db
    .select()
    .from(products)
    .where(eq(products.featured, 1))
    .orderBy(asc(products.featuredOrder), desc(products.createdAt))
    .all();
}

export async function getFeaturedCount(): Promise<number> {
  const db = await getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.featured, 1))
    .get();
  return result?.count || 0;
}

export async function getMaxFeaturedOrder(): Promise<number> {
  const db = await getDb();
  const result = await db
    .select({ max: sql<number>`COALESCE(MAX(featured_order), 0)` })
    .from(products)
    .where(eq(products.featured, 1))
    .get();
  return result?.max || 0;
}

export async function updateFeaturedOrder(
  items: Array<{ id: string; order: number }>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const statements = items.map(({ id, order }) =>
    db
      .update(products)
      .set({ featuredOrder: order, updatedAt: now })
      .where(eq(products.id, id))
  );

  await db.batch(statements as [typeof statements[0], ...typeof statements]);
}

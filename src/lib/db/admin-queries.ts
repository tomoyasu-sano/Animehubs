import { getDb } from "./index";
import { products, reservations, adminUsers } from "./schema";
import { eq, like, and, or, sql, desc, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Product, NewProduct, Reservation, AdminUser } from "./schema";

// ==================== 管理者ユーザー ====================

/**
 * ユーザー名で管理者を取得
 */
export function getAdminByUsername(username: string): AdminUser | undefined {
  const db = getDb();
  return db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .get();
}

/**
 * IDで管理者を取得
 */
export function getAdminById(id: string): AdminUser | undefined {
  const db = getDb();
  return db.select().from(adminUsers).where(eq(adminUsers.id, id)).get();
}

// ==================== 商品管理 ====================

interface AdminGetProductsOptions {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * 管理画面用: 商品一覧を取得
 */
export function adminGetProducts(options: AdminGetProductsOptions = {}): {
  items: Product[];
  total: number;
} {
  const db = getDb();
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

  const countResult = db
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

  const items = query.all();
  return { items, total };
}

/**
 * 商品を作成
 */
export function createProduct(input: Omit<NewProduct, "id" | "createdAt" | "updatedAt">): Product {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  db.insert(products)
    .values({
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return db.select().from(products).where(eq(products.id, id)).get()!;
}

/**
 * 商品を更新
 */
export function updateProduct(
  id: string,
  input: Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt">>
): Product | undefined {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.select().from(products).where(eq(products.id, id)).get();
  if (!existing) return undefined;

  db.update(products)
    .set({ ...input, updatedAt: now })
    .where(eq(products.id, id))
    .run();

  return db.select().from(products).where(eq(products.id, id)).get();
}

/**
 * 商品を削除
 */
export function deleteProduct(id: string): boolean {
  const db = getDb();
  const existing = db.select().from(products).where(eq(products.id, id)).get();
  if (!existing) return false;

  db.delete(products).where(eq(products.id, id)).run();
  return true;
}

// ==================== 予約管理 ====================

interface AdminGetReservationsOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * 管理画面用: 予約一覧を取得
 */
export function adminGetReservations(options: AdminGetReservationsOptions = {}): {
  items: Reservation[];
  total: number;
} {
  const db = getDb();
  const conditions = [];

  if (options.status) {
    conditions.push(eq(reservations.status, options.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = db
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

  const items = query.all();
  return { items, total };
}

// ==================== ダッシュボード ====================

export interface DashboardStats {
  totalProducts: number;
  totalReservations: number;
  totalRevenue: number;
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  recentReservations: Reservation[];
  salesByCategory: { category: string; total: number; count: number }[];
  salesByMonth: { month: string; total: number; count: number }[];
}

/**
 * ダッシュボードデータを取得
 */
export function getDashboardStats(): DashboardStats {
  const db = getDb();

  // 商品数
  const totalProducts =
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .get()?.count || 0;

  // 予約数
  const totalReservations =
    db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .get()?.count || 0;

  // 総売上（confirmed + completed のみ）
  const totalRevenue =
    db
      .select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` })
      .from(reservations)
      .where(
        or(
          eq(reservations.status, "confirmed"),
          eq(reservations.status, "completed")
        )
      )
      .get()?.total || 0;

  // ステータス別予約数
  const pendingReservations =
    db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(eq(reservations.status, "pending"))
      .get()?.count || 0;

  const confirmedReservations =
    db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(eq(reservations.status, "confirmed"))
      .get()?.count || 0;

  const completedReservations =
    db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(eq(reservations.status, "completed"))
      .get()?.count || 0;

  // 最近の予約（最新5件）
  const recentReservations = db
    .select()
    .from(reservations)
    .orderBy(desc(reservations.createdAt))
    .limit(5)
    .all();

  // カテゴリ別売上（予約itemsから集計）
  // items は JSON 文字列なので SQLite の JSON 関数は使わず、アプリ側で集計
  const allReservations = db
    .select()
    .from(reservations)
    .where(
      or(
        eq(reservations.status, "confirmed"),
        eq(reservations.status, "completed")
      )
    )
    .all();

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const r of allReservations) {
    try {
      const items = JSON.parse(r.items) as {
        productId: string;
        quantity: number;
        price: number;
        category?: string;
      }[];
      for (const item of items) {
        // 商品IDからカテゴリを取得
        const product = db
          .select({ category: products.category })
          .from(products)
          .where(eq(products.id, item.productId))
          .get();
        const cat = product?.category || "unknown";
        const existing = categoryMap.get(cat) || { total: 0, count: 0 };
        existing.total += item.price * item.quantity;
        existing.count += item.quantity;
        categoryMap.set(cat, existing);
      }
    } catch {
      // JSON パースエラーは無視
    }
  }

  const salesByCategory = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
    })
  );

  // 月別売上
  const monthMap = new Map<string, { total: number; count: number }>();
  for (const r of allReservations) {
    const month = r.createdAt.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(month) || { total: 0, count: 0 };
    existing.total += r.totalAmount;
    existing.count += 1;
    monthMap.set(month, existing);
  }

  const salesByMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalProducts,
    totalReservations,
    totalRevenue,
    pendingReservations,
    confirmedReservations,
    completedReservations,
    recentReservations,
    salesByCategory,
    salesByMonth,
  };
}

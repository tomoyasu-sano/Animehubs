import { getDb } from "./index";
import { products, reservations, adminUsers } from "./schema";
import { eq, like, and, or, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Product, NewProduct, Reservation, AdminUser } from "./schema";

// ==================== 管理者ユーザー ====================

export async function getAdminByUsername(username: string): Promise<AdminUser | undefined> {
  const db = await getDb();
  return db.select().from(adminUsers).where(eq(adminUsers.username, username)).get();
}

export async function getAdminById(id: string): Promise<AdminUser | undefined> {
  const db = await getDb();
  return db.select().from(adminUsers).where(eq(adminUsers.id, id)).get();
}

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

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();

  const totalProducts =
    (await db.select({ count: sql<number>`count(*)` }).from(products).get())?.count || 0;

  const totalReservations =
    (await db.select({ count: sql<number>`count(*)` }).from(reservations).get())?.count || 0;

  const totalRevenue =
    (
      await db
        .select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` })
        .from(reservations)
        .where(or(eq(reservations.status, "confirmed"), eq(reservations.status, "completed")))
        .get()
    )?.total || 0;

  const pendingReservations =
    (
      await db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(eq(reservations.status, "pending"))
        .get()
    )?.count || 0;

  const confirmedReservations =
    (
      await db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(eq(reservations.status, "confirmed"))
        .get()
    )?.count || 0;

  const completedReservations =
    (
      await db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(eq(reservations.status, "completed"))
        .get()
    )?.count || 0;

  const recentReservations = await db
    .select()
    .from(reservations)
    .orderBy(desc(reservations.createdAt))
    .limit(5)
    .all();

  const allReservations = await db
    .select()
    .from(reservations)
    .where(or(eq(reservations.status, "confirmed"), eq(reservations.status, "completed")))
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
        const product = await db
          .select({ category: products.category })
          .from(products)
          .where(eq(products.id, item.productId))
          .get();
        const cat = product?.category || "unknown";
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

  const monthMap = new Map<string, { total: number; count: number }>();
  for (const r of allReservations) {
    const month = r.createdAt.substring(0, 7);
    const existing = monthMap.get(month) || { total: 0, count: 0 };
    monthMap.set(month, { total: existing.total + r.totalAmount, count: existing.count + 1 });
  }

  const salesByMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, total: data.total, count: data.count }))
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

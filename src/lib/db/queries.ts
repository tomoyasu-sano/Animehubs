import { getDb } from "./index";
import { products } from "./schema";
import { eq, like, and, or, sql } from "drizzle-orm";
import type { Product } from "./schema";

interface GetProductsOptions {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 商品一覧を取得
 */
export function getProducts(options: GetProductsOptions = {}): {
  items: Product[];
  total: number;
} {
  const db = getDb();
  const conditions = [];

  if (options.category) {
    conditions.push(eq(products.category, options.category));
  }

  if (options.featured) {
    conditions.push(eq(products.featured, 1));
  }

  if (options.search) {
    const searchTerm = `%${options.search}%`;
    conditions.push(
      or(
        like(products.nameEn, searchTerm),
        like(products.nameSv, searchTerm),
        like(products.descriptionEn, searchTerm),
        like(products.descriptionSv, searchTerm)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 総件数を取得
  const countResult = db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause)
    .get();

  const total = countResult?.count || 0;

  // 商品を取得
  let query = db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(sql`created_at DESC`);

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
 * 商品をIDで取得
 */
export function getProductById(id: string): Product | undefined {
  const db = getDb();
  return db.select().from(products).where(eq(products.id, id)).get();
}

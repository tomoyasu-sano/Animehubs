import { getDb } from "./index";
import { products } from "./schema";
import { eq, like, and, or, ne, sql, desc } from "drizzle-orm";
import { CATEGORIES } from "../constants";
import type { Product } from "./schema";

interface GetProductsOptions {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export async function getProducts(options: GetProductsOptions = {}): Promise<{
  items: Product[];
  total: number;
}> {
  const db = await getDb();
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

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause)
    .get();

  const total = countResult?.count || 0;

  const orderByClause = options.featured
    ? sql`featured_order ASC, created_at DESC`
    : sql`created_at DESC`;

  let query = db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderByClause);

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  if (options.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  const items = await query.all();

  return { items, total };
}

export async function getRecommendedProducts(
  excludeId: string,
  category: string,
  limit?: number,
): Promise<Product[]> {
  if (!excludeId) {
    return [];
  }

  const effectiveLimit =
    limit === undefined ? 4 : Math.max(1, Math.min(20, limit));

  const db = await getDb();

  const isValidCategory = (CATEGORIES as readonly string[]).includes(category);
  const stockPriority = sql`CASE WHEN (${products.stock} - ${products.reservedStock}) > 0 THEN 0 ELSE 1 END ASC`;
  const random = sql`RANDOM()`;

  let sameCategoryResults: Product[] = [];

  // Phase 1: 同カテゴリから取得（有効なカテゴリの場合のみ）
  // 在庫あり優先、同じ在庫状況内ではランダム
  if (isValidCategory) {
    sameCategoryResults = await db
      .select()
      .from(products)
      .where(and(ne(products.id, excludeId), eq(products.category, category)))
      .orderBy(stockPriority, random)
      .limit(effectiveLimit)
      .all();
  }

  if (sameCategoryResults.length >= effectiveLimit) {
    return sameCategoryResults;
  }

  // Phase 2: 他カテゴリから不足分を補充
  // 在庫あり優先、同じ在庫状況内ではランダム
  const remaining = effectiveLimit - sameCategoryResults.length;
  const excludeIds = [excludeId, ...sameCategoryResults.map((p) => p.id)];
  const notInExcluded = sql`${products.id} NOT IN (${sql.join(
    excludeIds.map((id) => sql`${id}`),
    sql`, `,
  )})`;

  const phase2Where = isValidCategory
    ? and(notInExcluded, ne(products.category, category))
    : notInExcluded;

  const otherCategoryResults = await db
    .select()
    .from(products)
    .where(phase2Where)
    .orderBy(stockPriority, random)
    .limit(remaining)
    .all();

  return [...sameCategoryResults, ...otherCategoryResults];
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const db = await getDb();
  return db.select().from(products).where(eq(products.id, id)).get();
}

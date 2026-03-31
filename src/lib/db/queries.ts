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

  const items = await query.all();

  return { items, total };
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const db = await getDb();
  return db.select().from(products).where(eq(products.id, id)).get();
}

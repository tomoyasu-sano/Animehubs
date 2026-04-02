import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./index";
import { favorites, products } from "./schema";

const MAX_FAVORITES_PER_USER = 200;

type AddResult = { success: true } | { success: false; reason: "already_exists" };
type RemoveResult = { success: true } | { success: false; reason: "not_found" };

export type FavoriteWithProduct = {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    nameEn: string;
    nameSv: string;
    price: number;
    stock: number;
    reservedStock: number;
    images: string;
    likesCount: number;
  };
};

/**
 * お気に入り追加（likes_count +1 と同一バッチ）
 * UNIQUE 制約 (user_id, product_id) により重複挿入は自動で無視される
 */
export async function addFavorite(
  userId: string,
  productId: string,
): Promise<AddResult> {
  if (!userId || !productId) {
    throw new Error("userId and productId are required");
  }

  const db = await getDb();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // INSERT OR IGNORE で重複時はスキップ（race condition 対策）
  const insertResult = await db
    .insert(favorites)
    .values({ id, userId, productId, createdAt: now })
    .onConflictDoNothing({
      target: [favorites.userId, favorites.productId],
    })
    .returning({ id: favorites.id });

  // 挿入が実際に行われなかった場合 = 既に存在
  if (insertResult.length === 0) {
    return { success: false, reason: "already_exists" };
  }

  // likes_count を加算
  await db
    .update(products)
    .set({ likesCount: sql`${products.likesCount} + 1` })
    .where(eq(products.id, productId));

  return { success: true };
}

/**
 * お気に入り削除（DELETE + likes_count -1）
 * TOCTOU 回避: SELECT による存在チェックを省き、DELETE の returning で実際に
 * 削除されたかを判定してから likes_count をデクリメントする。
 */
export async function removeFavorite(
  userId: string,
  productId: string,
): Promise<RemoveResult> {
  const db = await getDb();

  // DELETE して実際に削除された行を返す（UNIQUE制約により最大1行）
  const deleted = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))
    .returning({ id: favorites.id });

  if (deleted.length === 0) {
    return { success: false, reason: "not_found" };
  }

  // 削除が成功した場合のみ likes_count をデクリメント
  await db
    .update(products)
    .set({ likesCount: sql`MAX(${products.likesCount} - 1, 0)` })
    .where(eq(products.id, productId));

  return { success: true };
}

/**
 * ユーザーのお気に入り一覧（商品情報JOIN）
 */
export async function getUserFavorites(
  userId: string,
): Promise<FavoriteWithProduct[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: favorites.id,
      userId: favorites.userId,
      productId: favorites.productId,
      createdAt: favorites.createdAt,
      product: {
        id: products.id,
        nameEn: products.nameEn,
        nameSv: products.nameSv,
        price: products.price,
        stock: products.stock,
        reservedStock: products.reservedStock,
        images: products.images,
        likesCount: products.likesCount,
      },
    })
    .from(favorites)
    .innerJoin(products, eq(favorites.productId, products.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt))
    .limit(MAX_FAVORITES_PER_USER);

  return rows;
}

/**
 * 特定の商品がお気に入り済みか確認
 */
export async function isProductFavorited(
  userId: string,
  productId: string,
): Promise<boolean> {
  const db = await getDb();

  const row = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))
    .get();

  return !!row;
}

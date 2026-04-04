import { eq, count, isNotNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index";
import { newsletterSubscribers, users } from "./schema";

/**
 * ユーザーをニュースレターに登録する（冪等）。
 * 既登録の場合は locale を更新する。
 */
export async function subscribeUser(
  userId: string,
  locale: "en" | "sv",
): Promise<{ subscribed: true; alreadySubscribed: boolean }> {
  if (!userId) throw new Error("userId is required");
  if (locale !== "en" && locale !== "sv") throw new Error("Invalid locale");

  const db = await getDb();

  // 既存チェック
  const existing = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.userId, userId))
    .get();

  const now = new Date().toISOString();

  if (existing) {
    // locale のみ更新
    await db
      .update(newsletterSubscribers)
      .set({ locale })
      .where(eq(newsletterSubscribers.userId, userId));
    return { subscribed: true, alreadySubscribed: true };
  }

  // 新規登録
  const id = uuidv4();
  await db
    .insert(newsletterSubscribers)
    .values({ id, userId, locale, createdAt: now });

  return { subscribed: true, alreadySubscribed: false };
}

/**
 * ユーザーのニュースレター購読を解除する。
 */
export async function unsubscribeUser(userId: string): Promise<{ success: true }> {
  if (!userId) throw new Error("userId is required");

  const db = await getDb();
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.userId, userId));

  return { success: true };
}

/**
 * ユーザーの購読状態を返す。
 */
export async function getSubscriptionStatus(userId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.userId, userId))
    .get();

  return !!row;
}

/**
 * 購読者数を返す。
 */
export async function getSubscriberCount(): Promise<number> {
  const db = await getDb();
  const row = await db
    .select({ count: count() })
    .from(newsletterSubscribers)
    .get();

  return row?.count ?? 0;
}

/**
 * 購読者のメール・locale 付きリストを返す（users JOIN）。
 */
export async function getSubscribersWithEmail(): Promise<
  Array<{ userId: string; email: string; locale: string; createdAt: string }>
> {
  const db = await getDb();
  const rows = await db
    .select({
      userId: newsletterSubscribers.userId,
      email: users.email,
      locale: newsletterSubscribers.locale,
      createdAt: newsletterSubscribers.createdAt,
    })
    .from(newsletterSubscribers)
    .innerJoin(users, eq(newsletterSubscribers.userId, users.id))
    .where(isNotNull(users.email))
    .all();

  return rows;
}

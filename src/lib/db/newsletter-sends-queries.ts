import { eq, desc, count, and, ne, gte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index";
import { newsletterSends } from "./schema";
import type { NewsletterSendStatus } from "./schema";

/**
 * ニュースレター送信履歴を作成する。
 */
export async function createNewsletterSend(input: {
  subjectEn: string;
  subjectSv: string;
  bodyEn: string;
  bodySv: string;
  recipientCount: number;
  sentBy: string;
}): Promise<{ id: string }> {
  if (!input.subjectEn) throw new Error("subjectEn is required");
  if (!input.subjectSv) throw new Error("subjectSv is required");
  if (!input.bodyEn) throw new Error("bodyEn is required");
  if (!input.bodySv) throw new Error("bodySv is required");
  if (input.subjectEn.length > 200) throw new Error("subjectEn must be 200 characters or less");
  if (input.subjectSv.length > 200) throw new Error("subjectSv must be 200 characters or less");
  if (input.bodyEn.length > 10000) throw new Error("bodyEn must be 10000 characters or less");
  if (input.bodySv.length > 10000) throw new Error("bodySv must be 10000 characters or less");
  if (input.recipientCount <= 0) throw new Error("recipientCount must be positive");
  if (!input.sentBy) throw new Error("sentBy is required");

  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.insert(newsletterSends).values({
    id,
    subjectEn: input.subjectEn,
    subjectSv: input.subjectSv,
    bodyEn: input.bodyEn,
    bodySv: input.bodySv,
    recipientCount: input.recipientCount,
    sentCount: 0,
    failedCount: 0,
    status: "sending",
    sentBy: input.sentBy,
    sentAt: now,
  });

  return { id };
}

/**
 * IDで送信履歴を取得する。
 */
export async function getNewsletterSendById(id: string) {
  const db = await getDb();
  const row = await db
    .select()
    .from(newsletterSends)
    .where(eq(newsletterSends.id, id))
    .get();

  return row ?? null;
}

/**
 * 送信履歴一覧をページネーション付きで取得する。
 * 本文は含めない（一覧用）。
 */
export async function getNewsletterSends(
  limit = 20,
  offset = 0,
): Promise<{
  sends: Array<{
    id: string;
    subjectEn: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    status: string;
    sentBy: string;
    sentAt: string;
  }>;
  total: number;
}> {
  const db = await getDb();

  const totalRow = await db
    .select({ count: count() })
    .from(newsletterSends)
    .get();

  const sends = await db
    .select({
      id: newsletterSends.id,
      subjectEn: newsletterSends.subjectEn,
      recipientCount: newsletterSends.recipientCount,
      sentCount: newsletterSends.sentCount,
      failedCount: newsletterSends.failedCount,
      status: newsletterSends.status,
      sentBy: newsletterSends.sentBy,
      sentAt: newsletterSends.sentAt,
    })
    .from(newsletterSends)
    .orderBy(desc(newsletterSends.sentAt))
    .limit(limit)
    .offset(offset)
    .all();

  return {
    sends,
    total: totalRow?.count ?? 0,
  };
}

/**
 * 直近1時間以内に failed 以外の送信履歴があるか判定する（重複送信防止）。
 */
export async function getRecentNonFailedSend(): Promise<boolean> {
  const db = await getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const row = await db
    .select({ id: newsletterSends.id })
    .from(newsletterSends)
    .where(
      and(
        gte(newsletterSends.sentAt, oneHourAgo),
        ne(newsletterSends.status, "failed"),
      ),
    )
    .orderBy(desc(newsletterSends.sentAt))
    .get();

  return !!row;
}

/**
 * 送信結果を更新する。
 */
export async function updateNewsletterSendResult(
  id: string,
  result: {
    sentCount: number;
    failedCount: number;
    status: NewsletterSendStatus;
  },
): Promise<void> {
  if (!id) throw new Error("id is required");

  const db = await getDb();
  await db
    .update(newsletterSends)
    .set({
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      status: result.status,
    })
    .where(eq(newsletterSends.id, id));
}

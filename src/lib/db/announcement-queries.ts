import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index";
import { siteAnnouncements } from "./schema";

/**
 * 有効な告知バナーを取得する。
 * 複数 active の場合は updated_at が最新の1件のみ返す。
 */
export async function getActiveAnnouncement(): Promise<{
  id: string;
  messageEn: string;
  messageSv: string;
} | null> {
  const db = await getDb();
  const row = await db
    .select({
      id: siteAnnouncements.id,
      messageEn: siteAnnouncements.messageEn,
      messageSv: siteAnnouncements.messageSv,
    })
    .from(siteAnnouncements)
    .where(eq(siteAnnouncements.active, 1))
    .orderBy(desc(siteAnnouncements.updatedAt))
    .get();

  return row ?? null;
}

/**
 * 告知バナーを作成/更新する。
 * active=true の場合、db.batch() で他レコードを inactive にしてから upsert する。
 */
export async function upsertAnnouncement(input: {
  id?: string;
  messageEn: string;
  messageSv: string;
  active: boolean;
}): Promise<{ success: true }> {
  if (!input.messageEn) throw new Error("messageEn is required");
  if (!input.messageSv) throw new Error("messageSv is required");
  if (input.messageEn.length > 500) throw new Error("messageEn must be 500 characters or less");
  if (input.messageSv.length > 500) throw new Error("messageSv must be 500 characters or less");

  const db = await getDb();
  const now = new Date().toISOString();
  const id = input.id ?? uuidv4();
  const activeInt = input.active ? 1 : 0;

  const queries = [];

  // active=true の場合、他レコードをすべて inactive にする
  if (input.active) {
    queries.push(
      db.update(siteAnnouncements).set({ active: 0, updatedAt: now }),
    );
  }

  if (input.id) {
    // 既存レコードの更新
    queries.push(
      db
        .update(siteAnnouncements)
        .set({
          messageEn: input.messageEn,
          messageSv: input.messageSv,
          active: activeInt,
          updatedAt: now,
        })
        .where(eq(siteAnnouncements.id, input.id)),
    );
  } else {
    // 新規作成
    queries.push(
      db.insert(siteAnnouncements).values({
        id,
        messageEn: input.messageEn,
        messageSv: input.messageSv,
        active: activeInt,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  await db.batch(queries as [typeof queries[0]]);

  return { success: true };
}

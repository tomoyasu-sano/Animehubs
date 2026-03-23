import { getDb } from "./index";
import { products, reservations } from "./schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import type { Reservation } from "./schema";
import type { ReservationItemInput } from "../validation";

export interface CreateReservationInput {
  customerName: string;
  customerEmail: string;
  location: string;
  timeSlot: string;
  items: ReservationItemInput[];
  totalAmount: number;
  notes?: string;
}

export interface StockCheckResult {
  ok: boolean;
  outOfStock: { productId: string; nameEn: string; requested: number; available: number }[];
}

/**
 * 在庫チェック（トランザクション外で事前確認用）
 */
export function checkStock(items: ReservationItemInput[]): StockCheckResult {
  const db = getDb();
  const outOfStock: StockCheckResult["outOfStock"] = [];

  for (const item of items) {
    const product = db.select().from(products).where(eq(products.id, item.productId)).get();
    if (!product) {
      outOfStock.push({
        productId: item.productId,
        nameEn: item.nameEn,
        requested: item.quantity,
        available: 0,
      });
      continue;
    }
    if (product.stock < item.quantity) {
      outOfStock.push({
        productId: item.productId,
        nameEn: product.nameEn,
        requested: item.quantity,
        available: product.stock,
      });
    }
  }

  return { ok: outOfStock.length === 0, outOfStock };
}

/**
 * 予約を作成（在庫確認 + 在庫減算をアトミックに実行）
 */
export function createReservation(input: CreateReservationInput): {
  ok: boolean;
  reservation?: Reservation;
  outOfStock?: StockCheckResult["outOfStock"];
} {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  // SQLite は better-sqlite3 で同期的にトランザクション実行
  // drizzle-orm の transaction を使用
  try {
    const result = db.transaction((tx) => {
      // 在庫確認
      const outOfStock: StockCheckResult["outOfStock"] = [];
      for (const item of input.items) {
        const product = tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .get();

        if (!product) {
          outOfStock.push({
            productId: item.productId,
            nameEn: item.nameEn,
            requested: item.quantity,
            available: 0,
          });
          continue;
        }
        if (product.stock < item.quantity) {
          outOfStock.push({
            productId: item.productId,
            nameEn: product.nameEn,
            requested: item.quantity,
            available: product.stock,
          });
        }
      }

      if (outOfStock.length > 0) {
        return { ok: false as const, outOfStock };
      }

      // 在庫減算
      for (const item of input.items) {
        tx.update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: now,
          })
          .where(eq(products.id, item.productId))
          .run();
      }

      // 予約作成
      const accessToken = crypto.randomBytes(16).toString("hex");
      tx.insert(reservations)
        .values({
          id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          location: input.location,
          timeSlot: input.timeSlot,
          status: "pending",
          totalAmount: input.totalAmount,
          items: JSON.stringify(input.items),
          accessToken,
          notes: input.notes || null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return { ok: true as const };
    });

    if (!result.ok) {
      return { ok: false, outOfStock: result.outOfStock };
    }

    // 作成した予約を取得して返す
    const reservation = db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .get();

    return { ok: true, reservation };
  } catch (error) {
    console.error("Failed to create reservation:", error);
    throw error;
  }
}

/**
 * 予約をIDで取得
 */
export function getReservationById(id: string): Reservation | undefined {
  const db = getDb();
  return db.select().from(reservations).where(eq(reservations.id, id)).get();
}

/**
 * 予約ステータスを更新
 */
export function updateReservationStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled"
): Reservation | undefined {
  const db = getDb();
  const now = new Date().toISOString();

  db.update(reservations)
    .set({ status, updatedAt: now })
    .where(eq(reservations.id, id))
    .run();

  return db.select().from(reservations).where(eq(reservations.id, id)).get();
}

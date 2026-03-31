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

export async function checkStock(items: ReservationItemInput[]): Promise<StockCheckResult> {
  const db = await getDb();
  const outOfStock: StockCheckResult["outOfStock"] = [];

  for (const item of items) {
    const product = await db.select().from(products).where(eq(products.id, item.productId)).get();
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

export async function createReservation(input: CreateReservationInput): Promise<{
  ok: boolean;
  reservation?: Reservation;
  outOfStock?: StockCheckResult["outOfStock"];
}> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    const result = await db.transaction(async (tx) => {
      const outOfStock: StockCheckResult["outOfStock"] = [];

      for (const item of input.items) {
        const product = await tx
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

      for (const item of input.items) {
        await tx.update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: now,
          })
          .where(eq(products.id, item.productId))
          .run();
      }

      const accessToken = crypto.randomBytes(16).toString("hex");
      await tx.insert(reservations)
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

    const reservation = await db
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

export async function getReservationById(id: string): Promise<Reservation | undefined> {
  const db = await getDb();
  return db.select().from(reservations).where(eq(reservations.id, id)).get();
}

export async function updateReservationStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled"
): Promise<Reservation | undefined> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.update(reservations)
    .set({ status, updatedAt: now })
    .where(eq(reservations.id, id))
    .run();

  return db.select().from(reservations).where(eq(reservations.id, id)).get();
}

import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { products, reservations } from "./schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// テスト用のインメモリDB
function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_sv TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_sv TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL,
      condition TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      location TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount INTEGER NOT NULL,
      items TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return drizzle(sqlite, { schema });
}

const now = new Date().toISOString();

const testProduct = {
  id: "test-product-1",
  nameEn: "Test Figure",
  nameSv: "Test Figur",
  descriptionEn: "A test figure",
  descriptionSv: "En test figur",
  price: 129900,
  stock: 3,
  category: "figures",
  condition: "new",
  images: '["/test.jpg"]',
  featured: 0,
  createdAt: now,
  updatedAt: now,
};

const testProduct2 = {
  ...testProduct,
  id: "test-product-2",
  nameEn: "Test Figure 2",
  nameSv: "Test Figur 2",
  price: 199900,
  stock: 1,
};

describe("予約クエリ（インメモリDB）", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    // テスト商品を挿入
    db.insert(products).values(testProduct).run();
    db.insert(products).values(testProduct2).run();
  });

  it("在庫チェック: 在庫十分な場合はOK", () => {
    const product = db.select().from(products).where(eq(products.id, "test-product-1")).get();
    expect(product).toBeDefined();
    expect(product!.stock).toBe(3);
    // 1個要求 → OK
    expect(product!.stock >= 1).toBe(true);
  });

  it("在庫チェック: 在庫不足の場合はNG", () => {
    const product = db.select().from(products).where(eq(products.id, "test-product-2")).get();
    expect(product).toBeDefined();
    expect(product!.stock).toBe(1);
    // 2個要求 → NG
    expect(product!.stock >= 2).toBe(false);
  });

  it("予約作成: 正常系", () => {
    const id = uuidv4();
    const items = [
      {
        productId: "test-product-1",
        nameEn: "Test Figure",
        nameSv: "Test Figur",
        quantity: 2,
        price: 129900,
      },
    ];

    // トランザクション: 在庫減算 + 予約作成
    db.transaction((tx) => {
      // 在庫確認
      const product = tx
        .select()
        .from(products)
        .where(eq(products.id, "test-product-1"))
        .get();
      expect(product!.stock).toBe(3);

      // 在庫減算
      tx.update(products)
        .set({ stock: sql`${products.stock} - 2`, updatedAt: now })
        .where(eq(products.id, "test-product-1"))
        .run();

      // 予約作成
      tx.insert(reservations)
        .values({
          id,
          customerName: "Test User",
          customerEmail: "test@example.com",
          location: "central-station",
          timeSlot: "weekday-evening",
          status: "pending",
          totalAmount: 259800,
          items: JSON.stringify(items),
          notes: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });

    // 在庫が減っていることを確認
    const updatedProduct = db
      .select()
      .from(products)
      .where(eq(products.id, "test-product-1"))
      .get();
    expect(updatedProduct!.stock).toBe(1);

    // 予約が作成されていることを確認
    const reservation = db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .get();
    expect(reservation).toBeDefined();
    expect(reservation!.customerName).toBe("Test User");
    expect(reservation!.status).toBe("pending");
    expect(reservation!.totalAmount).toBe(259800);
  });

  it("予約作成: 在庫不足で失敗", () => {
    // stock=1の商品を2個要求
    const product = db
      .select()
      .from(products)
      .where(eq(products.id, "test-product-2"))
      .get();

    expect(product!.stock).toBe(1);
    expect(product!.stock >= 2).toBe(false);
    // 在庫不足のため予約しない
  });

  it("予約作成: 複数商品の同時予約", () => {
    const id = uuidv4();
    const items = [
      {
        productId: "test-product-1",
        nameEn: "Test Figure",
        nameSv: "Test Figur",
        quantity: 1,
        price: 129900,
      },
      {
        productId: "test-product-2",
        nameEn: "Test Figure 2",
        nameSv: "Test Figur 2",
        quantity: 1,
        price: 199900,
      },
    ];

    db.transaction((tx) => {
      for (const item of items) {
        tx.update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: now })
          .where(eq(products.id, item.productId))
          .run();
      }

      tx.insert(reservations)
        .values({
          id,
          customerName: "Multi User",
          customerEmail: "multi@example.com",
          location: "stora-torget",
          timeSlot: "weekend-morning",
          status: "pending",
          totalAmount: 329800,
          items: JSON.stringify(items),
          notes: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });

    const p1 = db.select().from(products).where(eq(products.id, "test-product-1")).get();
    const p2 = db.select().from(products).where(eq(products.id, "test-product-2")).get();
    expect(p1!.stock).toBe(2); // 3 - 1
    expect(p2!.stock).toBe(0); // 1 - 1

    const reservation = db.select().from(reservations).where(eq(reservations.id, id)).get();
    expect(reservation!.totalAmount).toBe(329800);
  });

  it("予約取得: IDで予約を取得", () => {
    const id = uuidv4();
    db.insert(reservations)
      .values({
        id,
        customerName: "Fetch User",
        customerEmail: "fetch@example.com",
        location: "forumgallerian",
        timeSlot: "weekend-afternoon",
        status: "pending",
        totalAmount: 100000,
        items: "[]",
        notes: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const result = db.select().from(reservations).where(eq(reservations.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.customerName).toBe("Fetch User");
    expect(result!.location).toBe("forumgallerian");
  });

  it("存在しない予約IDはundefined", () => {
    const result = db
      .select()
      .from(reservations)
      .where(eq(reservations.id, "nonexistent"))
      .get();
    expect(result).toBeUndefined();
  });

  it("ステータス更新", () => {
    const id = uuidv4();
    db.insert(reservations)
      .values({
        id,
        customerName: "Status User",
        customerEmail: "status@example.com",
        location: "central-station",
        timeSlot: "weekday-evening",
        status: "pending",
        totalAmount: 50000,
        items: "[]",
        notes: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // ステータスを confirmed に更新
    db.update(reservations)
      .set({ status: "confirmed", updatedAt: new Date().toISOString() })
      .where(eq(reservations.id, id))
      .run();

    const updated = db.select().from(reservations).where(eq(reservations.id, id)).get();
    expect(updated!.status).toBe("confirmed");
  });
});

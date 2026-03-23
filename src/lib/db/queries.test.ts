import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeDatabase, getDb, schema } from "./index";
import { getProducts, getProductById } from "./queries";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

// テスト用DBパスを設定
const TEST_DB_PATH = "./data/test-animehubs.db";

beforeAll(() => {
  process.env.DATABASE_URL = TEST_DB_PATH;

  // テスト用DB初期化
  initializeDatabase();

  const db = getDb();

  // テストデータ挿入
  const testProducts = [
    {
      id: uuidv4(),
      nameEn: "Test Product 1",
      nameSv: "Testprodukt 1",
      descriptionEn: "A test figure",
      descriptionSv: "En testfigur",
      price: 100000,
      stock: 2,
      category: "nendoroid",
      condition: "new",
      images: JSON.stringify(["/test/image1.jpg"]),
      featured: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      nameEn: "Test Product 2",
      nameSv: "Testprodukt 2",
      descriptionEn: "Another test figure",
      descriptionSv: "Annan testfigur",
      price: 200000,
      stock: 0,
      category: "scale-figures",
      condition: "like_new",
      images: JSON.stringify([]),
      featured: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      nameEn: "Dragon Ball Z Figure",
      nameSv: "Dragon Ball Z Figur",
      descriptionEn: "Goku figure from Dragon Ball Z",
      descriptionSv: "Goku figur fran Dragon Ball Z",
      price: 50000,
      stock: 3,
      category: "figures",
      condition: "good",
      images: JSON.stringify([]),
      featured: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const product of testProducts) {
    db.insert(schema.products).values(product).run();
  }
});

afterAll(() => {
  // テスト用DB削除
  try {
    const dbPath = path.resolve(process.cwd(), TEST_DB_PATH);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
    if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
  } catch {
    // 無視
  }
});

describe("getProducts", () => {
  it("全商品を取得する", () => {
    const { items, total } = getProducts();
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it("カテゴリでフィルタリングする", () => {
    const { items } = getProducts({ category: "nendoroid" });
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const item of items) {
      expect(item.category).toBe("nendoroid");
    }
  });

  it("注目商品のみ取得する", () => {
    const { items } = getProducts({ featured: true });
    for (const item of items) {
      expect(item.featured).toBe(1);
    }
  });

  it("検索キーワードでフィルタリングする", () => {
    const { items } = getProducts({ search: "Dragon Ball" });
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("存在しないカテゴリでは空結果を返す", () => {
    const { items, total } = getProducts({ category: "nonexistent" });
    expect(items).toHaveLength(0);
    expect(total).toBe(0);
  });

  it("limitで件数を制限する", () => {
    const { items } = getProducts({ limit: 1 });
    expect(items).toHaveLength(1);
  });
});

describe("getProductById", () => {
  it("存在する商品をIDで取得する", () => {
    const { items } = getProducts({ limit: 1 });
    const product = getProductById(items[0].id);
    expect(product).toBeDefined();
    expect(product!.id).toBe(items[0].id);
  });

  it("存在しないIDではundefinedを返す", () => {
    const product = getProductById("nonexistent-id");
    expect(product).toBeUndefined();
  });
});

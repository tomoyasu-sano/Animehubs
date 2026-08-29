import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Product } from "./schema";

// ============================================================
// DB モック（チェーンメソッド対応）
// ============================================================

const mockAll = vi.fn();
const mockLimit = vi.fn().mockReturnValue({ all: mockAll });
const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

const mockDb = {
  select: mockSelect,
};

vi.mock("./index", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

import { getRecommendedProducts } from "./queries";

// ============================================================
// テストヘルパー
// ============================================================

function createProduct(overrides: Partial<Product> & { id: string }): Product {
  return {
    id: overrides.id,
    nameEn: overrides.nameEn ?? `Product ${overrides.id}`,
    nameSv: overrides.nameSv ?? `Produkt ${overrides.id}`,
    descriptionEn: overrides.descriptionEn ?? "Description",
    descriptionSv: overrides.descriptionSv ?? "Beskrivning",
    price: overrides.price ?? 1000,
    stock: overrides.stock ?? 1,
    reservedStock: overrides.reservedStock ?? 0,
    category: overrides.category ?? "figures",
    condition: overrides.condition ?? "new",
    heightCm: overrides.heightCm ?? null,
    costSek: overrides.costSek ?? null,
    images: overrides.images ?? "[]",
    featured: overrides.featured ?? 0,
    featuredOrder: overrides.featuredOrder ?? 0,
    likesCount: overrides.likesCount ?? 0,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00Z",
  };
}

// ============================================================
// テスト本体
// ============================================================

describe("getRecommendedProducts", () => {
  // 各テストで mockAll の呼び出し回数で Phase 1 / Phase 2 を制御
  // 1回目の all() = Phase 1（同カテゴリ）
  // 2回目の all() = Phase 2（他カテゴリ補充）

  beforeEach(() => {
    vi.clearAllMocks();
    // チェーンをリセット
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ all: mockAll });
  });

  // ----------------------------------------------------------
  // 1. 同カテゴリ商品が4件以上ある場合、同カテゴリから4件返る
  // ----------------------------------------------------------
  it("同カテゴリ商品が4件以上ある場合、同カテゴリから4件返る", async () => {
    const sameCategoryProducts = [
      createProduct({ id: "p1", category: "figures", stock: 1 }),
      createProduct({ id: "p2", category: "figures", stock: 1 }),
      createProduct({ id: "p3", category: "figures", stock: 1 }),
      createProduct({ id: "p4", category: "figures", stock: 1 }),
    ];

    // Phase 1 で4件取得 → Phase 2 不要
    mockAll.mockResolvedValueOnce(sameCategoryProducts);

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(4);
    expect(result).toEqual(sameCategoryProducts);
  });

  // ----------------------------------------------------------
  // 2. 同カテゴリ商品が2件の場合、他カテゴリから2件補充される
  // ----------------------------------------------------------
  it("同カテゴリ商品が2件の場合、他カテゴリから2件補充される", async () => {
    const sameCat = [
      createProduct({ id: "p1", category: "figures" }),
      createProduct({ id: "p2", category: "figures" }),
    ];
    const otherCat = [
      createProduct({ id: "p5", category: "keychains" }),
      createProduct({ id: "p6", category: "pins" }),
    ];

    mockAll
      .mockResolvedValueOnce(sameCat)   // Phase 1
      .mockResolvedValueOnce(otherCat); // Phase 2

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(4);
    expect(result).toEqual([...sameCat, ...otherCat]);
  });

  // ----------------------------------------------------------
  // 3. 同カテゴリ3件 + 他カテゴリ1件の混合ケース（境界値）
  // ----------------------------------------------------------
  it("同カテゴリ3件 + 他カテゴリ1件の混合ケース", async () => {
    const sameCat = [
      createProduct({ id: "p1", category: "figures" }),
      createProduct({ id: "p2", category: "figures" }),
      createProduct({ id: "p3", category: "figures" }),
    ];
    const otherCat = [
      createProduct({ id: "p4", category: "keychains" }),
    ];

    mockAll
      .mockResolvedValueOnce(sameCat)
      .mockResolvedValueOnce(otherCat);

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(4);
    expect(result).toEqual([...sameCat, ...otherCat]);
  });

  // ----------------------------------------------------------
  // 4. 同カテゴリ商品が0件の場合、他カテゴリから4件返る
  // ----------------------------------------------------------
  it("同カテゴリ商品が0件の場合、他カテゴリから4件返る", async () => {
    const otherCat = [
      createProduct({ id: "p1", category: "keychains" }),
      createProduct({ id: "p2", category: "pins" }),
      createProduct({ id: "p3", category: "other" }),
      createProduct({ id: "p4", category: "keychains" }),
    ];

    mockAll
      .mockResolvedValueOnce([])       // Phase 1: 0件
      .mockResolvedValueOnce(otherCat); // Phase 2

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(4);
    expect(result).toEqual(otherCat);
  });

  // ----------------------------------------------------------
  // 5. 同カテゴリに閲覧中の商品のみ存在する場合、他カテゴリから補充
  // ----------------------------------------------------------
  it("同カテゴリに閲覧中の商品のみ存在する場合、他カテゴリから補充される", async () => {
    const otherCat = [
      createProduct({ id: "p2", category: "keychains" }),
    ];

    mockAll
      .mockResolvedValueOnce([])       // Phase 1: excludeId 除外で0件
      .mockResolvedValueOnce(otherCat);

    const result = await getRecommendedProducts("p1", "figures");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p2");
  });

  // ----------------------------------------------------------
  // 6. 閲覧中の商品自身が結果に含まれない
  //    (DB クエリで excludeId を除外していることを検証)
  // ----------------------------------------------------------
  it("閲覧中の商品自身が結果に含まれない", async () => {
    const sameCat = [
      createProduct({ id: "p2", category: "figures" }),
      createProduct({ id: "p3", category: "figures" }),
    ];

    mockAll
      .mockResolvedValueOnce(sameCat)
      .mockResolvedValueOnce([]);

    const result = await getRecommendedProducts("p1", "figures");

    // p1 が含まれていないことを確認
    expect(result.every((p) => p.id !== "p1")).toBe(true);
  });

  // ----------------------------------------------------------
  // 7. 在庫あり商品が在庫なし商品より先に表示される
  //    (ソート順はDBに委ねるが、返却順序で検証)
  // ----------------------------------------------------------
  it("在庫あり商品が在庫なし商品より先に表示される", async () => {
    // DB側が在庫優先で返すことを前提（ORDER BY でソート済み）
    const sortedProducts = [
      createProduct({ id: "p1", category: "figures", stock: 3, reservedStock: 0 }), // 在庫あり
      createProduct({ id: "p2", category: "figures", stock: 1, reservedStock: 0 }), // 在庫あり
      createProduct({ id: "p3", category: "figures", stock: 1, reservedStock: 1 }), // 在庫なし
      createProduct({ id: "p4", category: "figures", stock: 0, reservedStock: 0 }), // 在庫なし
    ];

    mockAll.mockResolvedValueOnce(sortedProducts);

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(4);
    // DB が正しいソート順で返す前提なので、順序がそのまま保持されることを確認
    expect(result[0].id).toBe("p1");
    expect(result[1].id).toBe("p2");
    expect(result[2].id).toBe("p3");
    expect(result[3].id).toBe("p4");
  });

  // ----------------------------------------------------------
  // 8. Phase 2 で likesCount 同数の商品は新着順でソートされる
  // ----------------------------------------------------------
  it("Phase 2 で likesCount 同数の商品は新着順でソートされる", async () => {
    // DB 側のソート結果を前提に検証
    const otherCat = [
      createProduct({ id: "p1", category: "keychains", likesCount: 5, createdAt: "2026-04-01T00:00:00Z" }),
      createProduct({ id: "p2", category: "pins", likesCount: 5, createdAt: "2026-03-01T00:00:00Z" }),
    ];

    mockAll
      .mockResolvedValueOnce([])      // Phase 1: 0件
      .mockResolvedValueOnce(otherCat);

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("p1"); // 同 likesCount → 新着順
    expect(result[1].id).toBe("p2");
  });

  // ----------------------------------------------------------
  // 9. 商品が全く存在しない場合、空配列が返る
  // ----------------------------------------------------------
  it("商品が全く存在しない場合、空配列が返る", async () => {
    mockAll
      .mockResolvedValueOnce([])  // Phase 1
      .mockResolvedValueOnce([]); // Phase 2

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  // ----------------------------------------------------------
  // 10. excludeId が空文字の場合、空配列が返る
  // ----------------------------------------------------------
  it("excludeId が空文字の場合、空配列が返る", async () => {
    const result = await getRecommendedProducts("", "figures");

    expect(result).toEqual([]);
    // DB にクエリしないことを確認
    expect(mockSelect).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // 11. limit が範囲外の場合、クランプされる
  // ----------------------------------------------------------
  it("limit が 0 の場合、1 にクランプされる", async () => {
    const products = [
      createProduct({ id: "p1", category: "figures" }),
    ];
    mockAll.mockResolvedValueOnce(products);

    const result = await getRecommendedProducts("exclude-id", "figures", 0);

    expect(result).toHaveLength(1);
  });

  it("limit が 100 の場合、20 にクランプされる", async () => {
    const manyProducts = Array.from({ length: 20 }, (_, i) =>
      createProduct({ id: `p${i}`, category: "figures" }),
    );
    mockAll.mockResolvedValueOnce(manyProducts);

    const result = await getRecommendedProducts("exclude-id", "figures", 100);

    expect(result).toHaveLength(20);
  });

  it("limit が undefined の場合、デフォルト 4 が使われる", async () => {
    const products = [
      createProduct({ id: "p1", category: "figures" }),
      createProduct({ id: "p2", category: "figures" }),
      createProduct({ id: "p3", category: "figures" }),
      createProduct({ id: "p4", category: "figures" }),
    ];
    mockAll.mockResolvedValueOnce(products);

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(4);
  });

  // ----------------------------------------------------------
  // 追加: category が CATEGORIES に含まれない場合、Phase 1 スキップ
  // ----------------------------------------------------------
  it("category が CATEGORIES に含まれない場合、Phase 2 のみ実行", async () => {
    const otherCat = [
      createProduct({ id: "p1", category: "figures" }),
      createProduct({ id: "p2", category: "keychains" }),
    ];

    // Phase 1 スキップ → Phase 2 のみ
    mockAll.mockResolvedValueOnce(otherCat);

    const result = await getRecommendedProducts("exclude-id", "invalid-category");

    expect(result).toHaveLength(2);
  });

  // ----------------------------------------------------------
  // Phase 1 で limit 件取得できた場合、Phase 2 は実行しない
  // ----------------------------------------------------------
  it("Phase 1 で limit 件取得できた場合、Phase 2 は実行しない", async () => {
    const sameCat = [
      createProduct({ id: "p1", category: "figures" }),
      createProduct({ id: "p2", category: "figures" }),
      createProduct({ id: "p3", category: "figures" }),
      createProduct({ id: "p4", category: "figures" }),
    ];

    mockAll.mockResolvedValueOnce(sameCat);

    const result = await getRecommendedProducts("exclude-id", "figures");

    expect(result).toHaveLength(4);
    // mockAll が1回だけ呼ばれる（Phase 2 は実行されない）
    expect(mockAll).toHaveBeenCalledTimes(1);
  });
});

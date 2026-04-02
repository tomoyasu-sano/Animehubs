import { describe, it, expect, vi, beforeEach } from "vitest";

// DB モック（チェーンメソッド対応）
const mockReturning = vi.fn();
const mockOnConflictDoNothing = vi.fn().mockReturnValue({ returning: mockReturning });
const mockInsertValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
const mockDeleteWhere = vi.fn().mockReturnValue("delete-query");
const mockUpdateWhere = vi.fn().mockReturnValue("update-query");
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });

const mockDb = {
  select: vi.fn(),
  insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
  delete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
  update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
  batch: vi.fn(),
};

// getDb モック
vi.mock("./index", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

// auth モック
vi.mock("../auth-v2", () => ({
  auth: vi.fn(),
}));

import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isProductFavorited,
} from "./favorite-queries";

describe("favorite-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのチェーン設定を再適用
    mockDb.insert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
    mockOnConflictDoNothing.mockReturnValue({ returning: mockReturning });
    mockDb.update.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockDb.delete.mockReturnValue({ where: mockDeleteWhere });
  });

  // ============================================================
  // addFavorite
  // ============================================================
  describe("addFavorite", () => {
    it("正常系: お気に入りを追加し、likes_countを+1する", async () => {
      // onConflictDoNothing().returning() が挿入成功を返す
      mockReturning.mockResolvedValue([{ id: "new-fav-id" }]);

      const result = await addFavorite("user-1", "product-1");

      expect(result).toEqual({ success: true });
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it("重複の場合はalreadyExistsを返す", async () => {
      // onConflictDoNothing().returning() が空配列を返す（挿入スキップ）
      mockReturning.mockResolvedValue([]);

      const result = await addFavorite("user-1", "product-1");

      expect(result).toEqual({ success: false, reason: "already_exists" });
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("userIdが空の場合はエラー", async () => {
      await expect(addFavorite("", "product-1")).rejects.toThrow();
    });

    it("productIdが空の場合はエラー", async () => {
      await expect(addFavorite("user-1", "")).rejects.toThrow();
    });
  });

  // ============================================================
  // removeFavorite
  // ============================================================
  describe("removeFavorite", () => {
    it("正常系: お気に入りを削除し、likes_countを-1する", async () => {
      const mockDeleteReturning = vi.fn().mockResolvedValue([{ id: "fav-1" }]);
      const mockDeleteWhereLocal = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
      mockDb.delete.mockReturnValue({ where: mockDeleteWhereLocal });

      const result = await removeFavorite("user-1", "product-1");

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it("存在しないお気に入りはnot_foundを返す", async () => {
      const mockDeleteReturning = vi.fn().mockResolvedValue([]);
      const mockDeleteWhereLocal = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
      mockDb.delete.mockReturnValue({ where: mockDeleteWhereLocal });

      const result = await removeFavorite("user-1", "product-1");

      expect(result).toEqual({ success: false, reason: "not_found" });
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // getUserFavorites
  // ============================================================
  describe("getUserFavorites", () => {
    it("正常系: ユーザーのお気に入り一覧を商品情報付きで返す", async () => {
      const mockFavorites = [
        {
          id: "fav-1",
          userId: "user-1",
          productId: "product-1",
          createdAt: "2026-04-01T00:00:00Z",
          product: {
            id: "product-1",
            nameEn: "Figure A",
            nameSv: "Figur A",
            price: 29900,
            stock: 5,
            reservedStock: 0,
            images: '["img1.jpg"]',
            likesCount: 3,
          },
        },
      ];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockFavorites),
              }),
            }),
          }),
        }),
      });

      const result = await getUserFavorites("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].product.id).toBe("product-1");
    });

    it("お気に入りがない場合は空配列を返す", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await getUserFavorites("user-1");

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // isProductFavorited
  // ============================================================
  describe("isProductFavorited", () => {
    it("お気に入り済みの場合trueを返す", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ id: "fav-1" }),
          }),
        }),
      });

      const result = await isProductFavorited("user-1", "product-1");
      expect(result).toBe(true);
    });

    it("お気に入り未登録の場合falseを返す", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const result = await isProductFavorited("user-1", "product-1");
      expect(result).toBe(false);
    });
  });
});

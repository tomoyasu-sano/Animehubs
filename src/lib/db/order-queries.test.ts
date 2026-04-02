import { describe, it, expect, vi, beforeEach } from "vitest";

// DB モック（チェーンメソッド対応）
const mockGet = vi.fn();
const mockRun = vi.fn();
const mockSelectWhere = vi.fn().mockReturnValue({ get: mockGet });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockInsertValues = vi.fn().mockReturnValue("insert-query");
const mockUpdateWhere = vi.fn().mockReturnValue("update-query");
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });

const mockDb = {
  select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
  insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
  update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
  batch: vi.fn(),
};

vi.mock("./index", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-1234"),
}));

import {
  checkAvailableStock,
  createOrder,
  getOrderByCheckoutSessionId,
  updateOrderStatus,
  releaseReservedStock,
  confirmStockDeduction,
} from "./order-queries";
import type { OrderItem } from "./schema";

describe("order-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockReturnValue({ get: mockGet });
    mockDb.insert.mockReturnValue({ values: mockInsertValues });
    mockDb.update.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  });

  describe("checkAvailableStock", () => {
    it("在庫十分な場合 ok: true を返す", async () => {
      mockGet.mockResolvedValue({ id: "p1", stock: 5, reservedStock: 1 });

      const result = await checkAvailableStock([
        { productId: "p1", name: "Test", quantity: 2 },
      ]);

      expect(result.ok).toBe(true);
      expect(result.outOfStock).toHaveLength(0);
    });

    it("在庫不足の場合 ok: false を返す", async () => {
      mockGet.mockResolvedValue({ id: "p1", stock: 3, reservedStock: 2 });

      const result = await checkAvailableStock([
        { productId: "p1", name: "Test", quantity: 2 },
      ]);

      expect(result.ok).toBe(false);
      expect(result.outOfStock).toHaveLength(1);
      expect(result.outOfStock[0]).toMatchObject({
        productId: "p1",
        available: 1,
        requested: 2,
      });
    });

    it("商品が存在しない場合 ok: false を返す", async () => {
      mockGet.mockResolvedValue(undefined);

      const result = await checkAvailableStock([
        { productId: "nonexistent", name: "Test", quantity: 1 },
      ]);

      expect(result.ok).toBe(false);
      expect(result.outOfStock[0]).toMatchObject({
        productId: "nonexistent",
        available: 0,
      });
    });
  });

  describe("createOrder", () => {
    const baseInput = {
      userId: "user-1",
      customerName: "Test User",
      customerEmail: "test@example.com",
      type: "delivery" as const,
      items: [
        {
          product_id: "p1",
          name_en: "Figure A",
          name_sv: "Figur A",
          price: 29900,
          quantity: 1,
          image: "https://example.com/img.jpg",
        },
      ],
      totalAmount: 29900,
      stripeCheckoutSessionId: "cs_test_123",
    };

    it("在庫十分な場合に注文を作成する", async () => {
      // checkAvailableStock: 商品あり・在庫あり
      mockGet
        .mockResolvedValueOnce({ id: "p1", stock: 5, reservedStock: 0, nameEn: "Figure A" })
        // generateOrderNumber: 当日の注文数
        .mockResolvedValueOnce({ cnt: 0 })
        // 作成後の取得
        .mockResolvedValueOnce({ id: "mock-uuid-1234", orderNumber: "AH-20260402-0001" });

      const result = await createOrder(baseInput);

      expect(result.ok).toBe(true);
      expect(result.order).toBeDefined();
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it("在庫不足の場合は注文を作成しない", async () => {
      mockGet.mockResolvedValueOnce({ id: "p1", stock: 1, reservedStock: 1, nameEn: "Figure A" });

      const result = await createOrder(baseInput);

      expect(result.ok).toBe(false);
      expect(result.outOfStock).toBeDefined();
      expect(mockDb.batch).not.toHaveBeenCalled();
    });
  });

  describe("getOrderByCheckoutSessionId", () => {
    it("Stripe Session IDで注文を取得する", async () => {
      const mockOrder = { id: "order-1", stripeCheckoutSessionId: "cs_test_123" };
      mockGet.mockResolvedValue(mockOrder);

      const result = await getOrderByCheckoutSessionId("cs_test_123");

      expect(result).toEqual(mockOrder);
    });
  });

  describe("updateOrderStatus", () => {
    it("ステータスを更新する", async () => {
      mockRun.mockResolvedValue(undefined);
      mockUpdateWhere.mockReturnValue({ run: mockRun });
      mockGet.mockResolvedValue({ id: "order-1", status: "paid" });

      const result = await updateOrderStatus("order-1", "paid", {
        stripePaymentIntentId: "pi_test_123",
      });

      expect(result).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("releaseReservedStock", () => {
    it("reserved_stockを減算する", async () => {
      const items: OrderItem[] = [
        {
          product_id: "p1",
          name_en: "A",
          name_sv: "A",
          price: 100,
          quantity: 1,
          image: "",
        },
      ];

      await releaseReservedStock(items);

      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it("空の配列では batch を呼ばない", async () => {
      await releaseReservedStock([]);

      expect(mockDb.batch).not.toHaveBeenCalled();
    });
  });

  describe("confirmStockDeduction", () => {
    it("stock と reserved_stock を減算する", async () => {
      const items: OrderItem[] = [
        {
          product_id: "p1",
          name_en: "A",
          name_sv: "A",
          price: 100,
          quantity: 2,
          image: "",
        },
      ];

      await confirmStockDeduction(items);

      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });
  });
});

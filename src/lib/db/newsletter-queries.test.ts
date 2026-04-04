import { describe, it, expect, vi, beforeEach } from "vitest";

// DB モック（チェーンメソッド対応）
const mockInsertValues = vi.fn();
const mockDeleteWhere = vi.fn();
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockSelectGet = vi.fn();
const mockSelectWhere = vi.fn().mockReturnValue({ get: mockSelectGet });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });

const mockDb = {
  select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
  insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
  delete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
  update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
};

vi.mock("./index", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

import {
  subscribeUser,
  unsubscribeUser,
  getSubscriptionStatus,
  getSubscriberCount,
  getSubscribersWithEmail,
} from "./newsletter-queries";

describe("newsletter-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのチェーン設定を再適用
    mockDb.select.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockReturnValue({ get: mockSelectGet });
    mockDb.insert.mockReturnValue({ values: mockInsertValues });
    mockDb.delete.mockReturnValue({ where: mockDeleteWhere });
    mockDb.update.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  });

  // ============================================================
  // subscribeUser
  // ============================================================
  describe("subscribeUser", () => {
    it("新規登録: subscribed=true, alreadySubscribed=false を返す", async () => {
      // 既存チェック → 未登録
      mockSelectGet.mockResolvedValue(undefined);
      mockInsertValues.mockResolvedValue(undefined);

      const result = await subscribeUser("user-1", "en");

      expect(result).toEqual({ subscribed: true, alreadySubscribed: false });
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("既登録: subscribed=true, alreadySubscribed=true を返す", async () => {
      // 既存チェック → 登録済み
      mockSelectGet.mockResolvedValue({ id: "sub-1" });
      mockUpdateWhere.mockResolvedValue(undefined);

      const result = await subscribeUser("user-1", "en");

      expect(result).toEqual({ subscribed: true, alreadySubscribed: true });
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("userIdが空の場合はエラー", async () => {
      await expect(subscribeUser("", "en")).rejects.toThrow();
    });

    it("無効なlocaleの場合はエラー", async () => {
      await expect(subscribeUser("user-1", "fr" as "en" | "sv")).rejects.toThrow();
    });
  });

  // ============================================================
  // unsubscribeUser
  // ============================================================
  describe("unsubscribeUser", () => {
    it("正常系: 購読を解除する", async () => {
      mockDeleteWhere.mockResolvedValue(undefined);

      const result = await unsubscribeUser("user-1");

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it("userIdが空の場合はエラー", async () => {
      await expect(unsubscribeUser("")).rejects.toThrow();
    });
  });

  // ============================================================
  // getSubscriptionStatus
  // ============================================================
  describe("getSubscriptionStatus", () => {
    it("購読済みの場合 true を返す", async () => {
      mockSelectGet.mockResolvedValue({ id: "sub-1" });

      const result = await getSubscriptionStatus("user-1");

      expect(result).toBe(true);
    });

    it("未購読の場合 false を返す", async () => {
      mockSelectGet.mockResolvedValue(undefined);

      const result = await getSubscriptionStatus("user-1");

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // getSubscriberCount
  // ============================================================
  describe("getSubscriberCount", () => {
    it("購読者数を返す", async () => {
      const mockGet = vi.fn().mockResolvedValue({ count: 42 });
      mockSelectFrom.mockReturnValue({ get: mockGet });

      const result = await getSubscriberCount();

      expect(result).toBe(42);
    });

    it("購読者がいない場合は0を返す", async () => {
      const mockGet = vi.fn().mockResolvedValue({ count: 0 });
      mockSelectFrom.mockReturnValue({ get: mockGet });

      const result = await getSubscriberCount();

      expect(result).toBe(0);
    });
  });

  // ============================================================
  // getSubscribersWithEmail
  // ============================================================
  describe("getSubscribersWithEmail", () => {
    it("購読者のメールアドレス・locale付きリストを返す", async () => {
      const mockAll = vi.fn().mockResolvedValue([
        { email: "user1@example.com", locale: "en", createdAt: "2026-04-01" },
        { email: "user2@example.com", locale: "sv", createdAt: "2026-04-02" },
      ]);
      const mockInnerJoinWhere = vi.fn().mockReturnValue({ all: mockAll });
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockInnerJoinWhere });
      mockSelectFrom.mockReturnValue({ innerJoin: mockInnerJoin });

      const result = await getSubscribersWithEmail();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe("user1@example.com");
      expect(result[1].locale).toBe("sv");
    });

    it("購読者がいない場合は空配列を返す", async () => {
      const mockAll = vi.fn().mockResolvedValue([]);
      const mockInnerJoinWhere = vi.fn().mockReturnValue({ all: mockAll });
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockInnerJoinWhere });
      mockSelectFrom.mockReturnValue({ innerJoin: mockInnerJoin });

      const result = await getSubscribersWithEmail();

      expect(result).toEqual([]);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// DB モック（チェーンメソッド対応）
const mockInsertValues = vi.fn();
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockSelectGet = vi.fn();
const mockSelectAll = vi.fn();
const mockSelectLimit = vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ all: mockSelectAll }) });
const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectWhere = vi.fn().mockReturnValue({ get: mockSelectGet, orderBy: mockSelectOrderBy });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere, orderBy: mockSelectOrderBy });

const mockDb = {
  select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
  insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
  update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
};

vi.mock("./index", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

import {
  createNewsletterSend,
  getNewsletterSendById,
  getNewsletterSends,
  getRecentNonFailedSend,
  updateNewsletterSendResult,
} from "./newsletter-sends-queries";

describe("newsletter-sends-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // チェーン設定再適用
    mockDb.select.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockSelectOrderBy });
    mockSelectWhere.mockReturnValue({ get: mockSelectGet, orderBy: mockSelectOrderBy });
    mockSelectOrderBy.mockReturnValue({ limit: mockSelectLimit });
    mockSelectLimit.mockReturnValue({ offset: vi.fn().mockReturnValue({ all: mockSelectAll }) });
    mockDb.insert.mockReturnValue({ values: mockInsertValues });
    mockDb.update.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  });

  // ============================================================
  // createNewsletterSend
  // ============================================================
  describe("createNewsletterSend", () => {
    it("送信履歴を作成して id を返す", async () => {
      mockInsertValues.mockResolvedValue(undefined);

      const result = await createNewsletterSend({
        subjectEn: "New items!",
        subjectSv: "Nya varor!",
        bodyEn: "Check out our new items",
        bodySv: "Kolla in våra nya varor",
        recipientCount: 42,
        sentBy: "admin@example.com",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("件名が空の場合はエラー", async () => {
      await expect(
        createNewsletterSend({
          subjectEn: "",
          subjectSv: "Nya varor!",
          bodyEn: "body",
          bodySv: "body",
          recipientCount: 1,
          sentBy: "admin@example.com",
        }),
      ).rejects.toThrow("subjectEn is required");
    });

    it("件名が200文字超の場合はエラー", async () => {
      await expect(
        createNewsletterSend({
          subjectEn: "a".repeat(201),
          subjectSv: "Nya varor!",
          bodyEn: "body",
          bodySv: "body",
          recipientCount: 1,
          sentBy: "admin@example.com",
        }),
      ).rejects.toThrow("subjectEn must be 200 characters or less");
    });

    it("本文が10000文字超の場合はエラー", async () => {
      await expect(
        createNewsletterSend({
          subjectEn: "Subject",
          subjectSv: "Ämne",
          bodyEn: "a".repeat(10001),
          bodySv: "body",
          recipientCount: 1,
          sentBy: "admin@example.com",
        }),
      ).rejects.toThrow("bodyEn must be 10000 characters or less");
    });

    it("recipientCount が0以下の場合はエラー", async () => {
      await expect(
        createNewsletterSend({
          subjectEn: "Subject",
          subjectSv: "Ämne",
          bodyEn: "body",
          bodySv: "body",
          recipientCount: 0,
          sentBy: "admin@example.com",
        }),
      ).rejects.toThrow("recipientCount must be positive");
    });
  });

  // ============================================================
  // getNewsletterSendById
  // ============================================================
  describe("getNewsletterSendById", () => {
    it("IDで送信履歴を取得する", async () => {
      const mockSend = {
        id: "send-1",
        subjectEn: "Subject",
        subjectSv: "Ämne",
        bodyEn: "Body",
        bodySv: "Kropp",
        recipientCount: 42,
        sentCount: 40,
        failedCount: 2,
        status: "partial_failure",
        sentBy: "admin@example.com",
        sentAt: "2026-04-04T12:00:00Z",
      };
      mockSelectGet.mockResolvedValue(mockSend);

      const result = await getNewsletterSendById("send-1");

      expect(result).toEqual(mockSend);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it("存在しないIDの場合はnullを返す", async () => {
      mockSelectGet.mockResolvedValue(undefined);

      const result = await getNewsletterSendById("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // getNewsletterSends（ページネーション）
  // ============================================================
  describe("getNewsletterSends", () => {
    it("送信履歴一覧をページネーション付きで返す", async () => {
      const mockSends = [
        { id: "send-1", subjectEn: "Subject 1", recipientCount: 42, sentCount: 42, failedCount: 0, status: "completed", sentBy: "admin@example.com", sentAt: "2026-04-04T12:00:00Z" },
        { id: "send-2", subjectEn: "Subject 2", recipientCount: 38, sentCount: 38, failedCount: 0, status: "completed", sentBy: "admin@example.com", sentAt: "2026-04-03T12:00:00Z" },
      ];

      // count クエリ
      const mockCountGet = vi.fn().mockResolvedValue({ count: 5 });
      const mockCountFrom = vi.fn().mockReturnValue({ get: mockCountGet });
      // list クエリ
      const mockListAll = vi.fn().mockResolvedValue(mockSends);
      const mockListOffset = vi.fn().mockReturnValue({ all: mockListAll });
      const mockListLimit = vi.fn().mockReturnValue({ offset: mockListOffset });
      const mockListOrderBy = vi.fn().mockReturnValue({ limit: mockListLimit });
      const mockListFrom = vi.fn().mockReturnValue({ orderBy: mockListOrderBy });

      mockDb.select
        .mockReturnValueOnce({ from: mockCountFrom })
        .mockReturnValueOnce({ from: mockListFrom });

      const result = await getNewsletterSends(20, 0);

      expect(result.total).toBe(5);
      expect(result.sends).toHaveLength(2);
      expect(result.sends[0].id).toBe("send-1");
    });

    it("limit のデフォルト値は20", async () => {
      const mockCountGet = vi.fn().mockResolvedValue({ count: 0 });
      const mockCountFrom = vi.fn().mockReturnValue({ get: mockCountGet });
      const mockListAll = vi.fn().mockResolvedValue([]);
      const mockListOffset = vi.fn().mockReturnValue({ all: mockListAll });
      const mockListLimit = vi.fn().mockReturnValue({ offset: mockListOffset });
      const mockListOrderBy = vi.fn().mockReturnValue({ limit: mockListLimit });
      const mockListFrom = vi.fn().mockReturnValue({ orderBy: mockListOrderBy });

      mockDb.select
        .mockReturnValueOnce({ from: mockCountFrom })
        .mockReturnValueOnce({ from: mockListFrom });

      const result = await getNewsletterSends();

      expect(result.total).toBe(0);
      expect(result.sends).toEqual([]);
    });
  });

  // ============================================================
  // getRecentNonFailedSend（重複送信防止）
  // ============================================================
  describe("getRecentNonFailedSend", () => {
    it("直近1時間以内の非failedレコードがあればtrueを返す", async () => {
      const mockOrderByGet = vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ id: "send-1" }) });
      mockSelectWhere.mockReturnValue({ orderBy: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ id: "send-1" }) }) });

      const result = await getRecentNonFailedSend();

      expect(result).toBe(true);
    });

    it("直近1時間以内にレコードがなければfalseを返す", async () => {
      mockSelectWhere.mockReturnValue({ orderBy: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(undefined) }) });

      const result = await getRecentNonFailedSend();

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // updateNewsletterSendResult
  // ============================================================
  describe("updateNewsletterSendResult", () => {
    it("送信結果を更新する（completed）", async () => {
      mockUpdateWhere.mockResolvedValue(undefined);

      await updateNewsletterSendResult("send-1", {
        sentCount: 42,
        failedCount: 0,
        status: "completed",
      });

      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it("送信結果を更新する（partial_failure）", async () => {
      mockUpdateWhere.mockResolvedValue(undefined);

      await updateNewsletterSendResult("send-1", {
        sentCount: 40,
        failedCount: 2,
        status: "partial_failure",
      });

      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it("IDが空の場合はエラー", async () => {
      await expect(
        updateNewsletterSendResult("", {
          sentCount: 0,
          failedCount: 0,
          status: "failed",
        }),
      ).rejects.toThrow("id is required");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// DB モック
const mockSelectGet = vi.fn();
const mockSelectWhere = vi.fn().mockReturnValue({ get: mockSelectGet });
const mockSelectOrderBy = vi.fn().mockReturnValue({ get: mockSelectGet });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockInsertValues = vi.fn();
const mockUpdateWhere = vi.fn();
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

import {
  getActiveAnnouncement,
  upsertAnnouncement,
} from "./announcement-queries";

describe("announcement-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });
    mockSelectOrderBy.mockReturnValue({ get: mockSelectGet });
    mockDb.insert.mockReturnValue({ values: mockInsertValues });
    mockDb.update.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  });

  // ============================================================
  // getActiveAnnouncement
  // ============================================================
  describe("getActiveAnnouncement", () => {
    it("有効なバナーを返す", async () => {
      const announcement = {
        messageEn: "New items arriving!",
        messageSv: "Nya varor kommer!",
      };
      mockSelectGet.mockResolvedValue(announcement);

      const result = await getActiveAnnouncement();

      expect(result).toEqual(announcement);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it("有効なバナーがない場合 null を返す", async () => {
      mockSelectGet.mockResolvedValue(undefined);

      const result = await getActiveAnnouncement();

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // upsertAnnouncement
  // ============================================================
  describe("upsertAnnouncement", () => {
    it("新規作成: active=true でバッチ実行する", async () => {
      mockDb.batch.mockResolvedValue(undefined);

      const result = await upsertAnnouncement({
        messageEn: "New items!",
        messageSv: "Nya varor!",
        active: true,
      });

      expect(result).toEqual({ success: true });
      // active=true の場合、他レコードを inactive にする + upsert のバッチ
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it("active=false の場合もバッチ実行する", async () => {
      mockDb.batch.mockResolvedValue(undefined);

      const result = await upsertAnnouncement({
        messageEn: "Coming soon",
        messageSv: "Kommer snart",
        active: false,
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it("既存ID指定で更新する", async () => {
      mockDb.batch.mockResolvedValue(undefined);

      const result = await upsertAnnouncement({
        id: "existing-id",
        messageEn: "Updated!",
        messageSv: "Uppdaterad!",
        active: true,
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it("messageEnが空の場合はエラー", async () => {
      await expect(
        upsertAnnouncement({ messageEn: "", messageSv: "Hej", active: true }),
      ).rejects.toThrow();
    });

    it("messageSvが空の場合はエラー", async () => {
      await expect(
        upsertAnnouncement({ messageEn: "Hello", messageSv: "", active: true }),
      ).rejects.toThrow();
    });

    it("messageEnが500文字超の場合はエラー", async () => {
      await expect(
        upsertAnnouncement({
          messageEn: "a".repeat(501),
          messageSv: "Hej",
          active: true,
        }),
      ).rejects.toThrow();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Resend モック
const { mockBatchSend } = vi.hoisted(() => {
  const mockBatchSend = vi.fn();
  return { mockBatchSend };
});
vi.mock("resend", () => ({
  Resend: class {
    batch = { send: mockBatchSend };
  },
}));

// DB クエリモック
const mockGetSubscribersWithEmail = vi.fn();
const mockCreateNewsletterSend = vi.fn();
const mockUpdateNewsletterSendResult = vi.fn();
const mockGetRecentNonFailedSend = vi.fn();

vi.mock("@/lib/db/newsletter-queries", () => ({
  getSubscribersWithEmail: (...args: unknown[]) => mockGetSubscribersWithEmail(...args),
}));

vi.mock("@/lib/db/newsletter-sends-queries", () => ({
  createNewsletterSend: (...args: unknown[]) => mockCreateNewsletterSend(...args),
  updateNewsletterSendResult: (...args: unknown[]) => mockUpdateNewsletterSendResult(...args),
  getRecentNonFailedSend: () => mockGetRecentNonFailedSend(),
}));

// メールテンプレートモック
vi.mock("./newsletter-template", () => ({
  buildNewsletterEmailHtml: vi.fn().mockReturnValue("<html>newsletter</html>"),
}));

// 商品取得モック
const mockGetRecentProducts = vi.fn();
vi.mock("@/lib/db/admin-queries", () => ({
  getRecentProducts: (...args: unknown[]) => mockGetRecentProducts(...args),
}));

import { sendNewsletter, type SendNewsletterInput } from "./send-newsletter";

describe("sendNewsletter", () => {
  const baseInput: SendNewsletterInput = {
    subjectEn: "New anime goods!",
    subjectSv: "Nya anime-varor!",
    bodyEn: "Check out our new items.",
    bodySv: "Kolla in våra nya varor.",
    includeRecentProducts: false,
    recentProductsDays: 7,
    testMode: false,
    adminEmail: "admin@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecentNonFailedSend.mockResolvedValue(false);
    mockCreateNewsletterSend.mockResolvedValue({ id: "send-1" });
    mockUpdateNewsletterSendResult.mockResolvedValue(undefined);
  });

  it("正常系: locale別にグループ化してバッチ送信する", async () => {
    mockGetSubscribersWithEmail.mockResolvedValue([
      { email: "user1@example.com", locale: "en", createdAt: "2026-04-01" },
      { email: "user2@example.com", locale: "sv", createdAt: "2026-04-02" },
      { email: "user3@example.com", locale: "en", createdAt: "2026-04-03" },
    ]);

    mockBatchSend.mockResolvedValue({
      data: { data: [{ id: "msg-1" }, { id: "msg-2" }, { id: "msg-3" }] },
      error: null,
    });

    const result = await sendNewsletter(baseInput);

    expect(result.success).toBe(true);
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
    expect(mockCreateNewsletterSend).toHaveBeenCalledTimes(1);
    expect(mockUpdateNewsletterSendResult).toHaveBeenCalledWith("send-1", {
      sentCount: 3,
      failedCount: 0,
      status: "completed",
    });
  });

  it("テストモード: 管理者のメールアドレスにのみ送信", async () => {
    mockBatchSend.mockResolvedValue({
      data: { data: [{ id: "msg-1" }] },
      error: null,
    });

    const result = await sendNewsletter({ ...baseInput, testMode: true });

    expect(result.success).toBe(true);
    expect(result.sent).toBe(1);
    // テストモードでは subscribers を取得しない
    expect(mockGetSubscribersWithEmail).not.toHaveBeenCalled();
    // テストモードでは送信履歴を保存しない
    expect(mockCreateNewsletterSend).not.toHaveBeenCalled();
  });

  it("重複送信防止: 直近1時間以内に送信済みなら429エラー", async () => {
    mockGetRecentNonFailedSend.mockResolvedValue(true);

    const result = await sendNewsletter(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("recently sent");
    expect(mockBatchSend).not.toHaveBeenCalled();
  });

  it("テストモードでは重複送信チェックをスキップ", async () => {
    mockGetRecentNonFailedSend.mockResolvedValue(true);
    mockBatchSend.mockResolvedValue({
      data: { data: [{ id: "msg-1" }] },
      error: null,
    });

    const result = await sendNewsletter({ ...baseInput, testMode: true });

    expect(result.success).toBe(true);
    expect(mockGetRecentNonFailedSend).not.toHaveBeenCalled();
  });

  it("購読者が0人の場合はエラー", async () => {
    mockGetSubscribersWithEmail.mockResolvedValue([]);

    const result = await sendNewsletter(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("No subscribers");
  });

  it("Resend APIがバッチ全体エラーを返した場合", async () => {
    mockGetSubscribersWithEmail.mockResolvedValue([
      { email: "user1@example.com", locale: "en", createdAt: "2026-04-01" },
    ]);

    mockBatchSend.mockResolvedValue({
      data: null,
      error: { message: "API key invalid" },
    });

    const result = await sendNewsletter(baseInput);

    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockUpdateNewsletterSendResult).toHaveBeenCalledWith("send-1", {
      sentCount: 0,
      failedCount: 1,
      status: "failed",
    });
  });

  it("部分失敗: sent_count と failed_count を正しく集計", async () => {
    mockGetSubscribersWithEmail.mockResolvedValue([
      { email: "user1@example.com", locale: "en", createdAt: "2026-04-01" },
      { email: "bad@example.com", locale: "en", createdAt: "2026-04-02" },
      { email: "user3@example.com", locale: "en", createdAt: "2026-04-03" },
    ]);

    mockBatchSend.mockResolvedValue({
      data: { data: [{ id: "msg-1" }, { id: "msg-3" }] },
      error: null,
    });

    const result = await sendNewsletter(baseInput);

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(1);
    expect(mockUpdateNewsletterSendResult).toHaveBeenCalledWith("send-1", {
      sentCount: 2,
      failedCount: 1,
      status: "partial_failure",
    });
  });

  it("商品自動挿入: includeRecentProducts=true の場合", async () => {
    mockGetSubscribersWithEmail.mockResolvedValue([
      { email: "user1@example.com", locale: "en", createdAt: "2026-04-01" },
    ]);
    mockGetRecentProducts.mockResolvedValue([
      { id: "p1", nameEn: "Naruto Figure", price: 29900, images: '["https://example.com/img.jpg"]' },
    ]);
    mockBatchSend.mockResolvedValue({
      data: { data: [{ id: "msg-1" }] },
      error: null,
    });

    const result = await sendNewsletter({
      ...baseInput,
      includeRecentProducts: true,
    });

    expect(result.success).toBe(true);
    expect(mockGetRecentProducts).toHaveBeenCalledWith(7);
  });
});

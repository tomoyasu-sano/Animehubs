import { describe, it, expect, vi, beforeEach } from "vitest";

// admin-auth モック
const mockGetAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => mockGetAdminSession(),
}));

// send-newsletter モック
const mockSendNewsletter = vi.fn();
vi.mock("@/lib/email/send-newsletter", () => ({
  sendNewsletter: (...args: unknown[]) => mockSendNewsletter(...args),
}));

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/admin/newsletter/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/newsletter/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合は401を返す", async () => {
    mockGetAdminSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ subjectEn: "Test" }));

    expect(res.status).toBe(401);
  });

  it("正常系: 送信成功", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u1", email: "admin@example.com", role: "admin" });
    mockSendNewsletter.mockResolvedValue({ success: true, sent: 42, failed: 0 });

    const res = await POST(
      makeRequest({
        subjectEn: "New items!",
        subjectSv: "Nya varor!",
        bodyEn: "Check out new items",
        bodySv: "Kolla nya varor",
        includeRecentProducts: false,
        recentProductsDays: 7,
        testMode: false,
      }),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; sent: number };
    expect(data.success).toBe(true);
    expect(data.sent).toBe(42);
  });

  it("バリデーション: 件名が空の場合は400", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u1", email: "admin@example.com", role: "admin" });

    const res = await POST(
      makeRequest({
        subjectEn: "",
        subjectSv: "Nya varor!",
        bodyEn: "body",
        bodySv: "body",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("バリデーション: 件名が200文字超の場合は400", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u1", email: "admin@example.com", role: "admin" });

    const res = await POST(
      makeRequest({
        subjectEn: "a".repeat(201),
        subjectSv: "ok",
        bodyEn: "body",
        bodySv: "body",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("重複送信時は429を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u1", email: "admin@example.com", role: "admin" });
    mockSendNewsletter.mockResolvedValue({ success: false, sent: 0, failed: 0, error: "Newsletter was recently sent. Please wait before sending again." });

    const res = await POST(
      makeRequest({
        subjectEn: "Subject",
        subjectSv: "Ämne",
        bodyEn: "body",
        bodySv: "body",
      }),
    );

    expect(res.status).toBe(429);
  });
});

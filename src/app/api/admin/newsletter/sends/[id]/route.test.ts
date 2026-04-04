import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => mockGetAdminSession(),
}));

const mockGetNewsletterSendById = vi.fn();
vi.mock("@/lib/db/newsletter-sends-queries", () => ({
  getNewsletterSendById: (...args: unknown[]) => mockGetNewsletterSendById(...args),
}));

import { GET } from "./route";

function makeRequest(): Request {
  return new Request("http://localhost/api/admin/newsletter/sends/send-1");
}

describe("GET /api/admin/newsletter/sends/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合は401を返す", async () => {
    mockGetAdminSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "send-1" }) });
    expect(res.status).toBe(401);
  });

  it("正常系: 送信履歴詳細を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u1", email: "admin@example.com", role: "admin" });
    mockGetNewsletterSendById.mockResolvedValue({
      id: "send-1",
      subjectEn: "Subject",
      subjectSv: "Ämne",
      bodyEn: "Body",
      bodySv: "Kropp",
      recipientCount: 42,
      sentCount: 42,
      failedCount: 0,
      status: "completed",
      sentBy: "admin@example.com",
      sentAt: "2026-04-04T12:00:00Z",
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "send-1" }) });
    const data = (await res.json()) as { id: string; bodyEn: string };

    expect(res.status).toBe(200);
    expect(data.id).toBe("send-1");
    expect(data.bodyEn).toBe("Body");
  });

  it("存在しないIDの場合は404を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u1", email: "admin@example.com", role: "admin" });
    mockGetNewsletterSendById.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

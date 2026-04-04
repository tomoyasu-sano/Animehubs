import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => mockGetAdminSession(),
}));

const mockGetNewsletterSends = vi.fn();
vi.mock("@/lib/db/newsletter-sends-queries", () => ({
  getNewsletterSends: (...args: unknown[]) => mockGetNewsletterSends(...args),
}));

import { GET } from "./route";

function makeRequest(params = ""): Request {
  return new Request(`http://localhost/api/admin/newsletter/sends${params}`);
}

describe("GET /api/admin/newsletter/sends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合は401を返す", async () => {
    mockGetAdminSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("正常系: 送信履歴一覧を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u1", email: "admin@example.com", role: "admin" });
    mockGetNewsletterSends.mockResolvedValue({
      sends: [{ id: "s1", subjectEn: "Test", recipientCount: 42, sentCount: 42, failedCount: 0, status: "completed", sentBy: "admin@example.com", sentAt: "2026-04-04T12:00:00Z" }],
      total: 1,
    });

    const res = await GET(makeRequest("?limit=20&offset=0"));
    const data = (await res.json()) as { sends: unknown[]; total: number };

    expect(res.status).toBe(200);
    expect(data.sends).toHaveLength(1);
    expect(data.total).toBe(1);
  });
});

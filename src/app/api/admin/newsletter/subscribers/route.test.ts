import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => mockGetAdminSession(),
}));

const mockGetSubscriberCount = vi.fn();
const mockGetSubscribersWithEmail = vi.fn();
vi.mock("@/lib/db/newsletter-queries", () => ({
  getSubscriberCount: () => mockGetSubscriberCount(),
  getSubscribersWithEmail: () => mockGetSubscribersWithEmail(),
}));

describe("GET /api/admin/newsletter/subscribers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合 401 を返す", async () => {
    mockGetAdminSession.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("管理者の場合、購読者リストとカウントを返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "admin-1", email: "admin@test.com", role: "admin" });
    mockGetSubscriberCount.mockResolvedValue(2);
    mockGetSubscribersWithEmail.mockResolvedValue([
      { email: "user1@test.com", locale: "en", createdAt: "2026-04-01" },
      { email: "user2@test.com", locale: "sv", createdAt: "2026-04-02" },
    ]);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(2);
    expect(body.subscribers).toHaveLength(2);
    expect(body.subscribers[0].email).toBe("user1@test.com");
  });
});

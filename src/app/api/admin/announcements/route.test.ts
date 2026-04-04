import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => mockGetAdminSession(),
}));

const mockUpsertAnnouncement = vi.fn();
vi.mock("@/lib/db/announcement-queries", () => ({
  upsertAnnouncement: (...args: unknown[]) => mockUpsertAnnouncement(...args),
}));

describe("PUT /api/admin/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合 401 を返す", async () => {
    mockGetAdminSession.mockResolvedValue(null);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/admin/announcements", {
      method: "PUT",
      body: JSON.stringify({ messageEn: "Hello", messageSv: "Hej", active: true }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);

    expect(response.status).toBe(401);
  });

  it("正常なリクエストで success を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "admin-1", email: "admin@test.com", role: "admin" });
    mockUpsertAnnouncement.mockResolvedValue({ success: true });

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/admin/announcements", {
      method: "PUT",
      body: JSON.stringify({ messageEn: "New items!", messageSv: "Nya varor!", active: true }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(mockUpsertAnnouncement).toHaveBeenCalledWith({
      id: undefined,
      messageEn: "New items!",
      messageSv: "Nya varor!",
      active: true,
    });
  });

  it("messageEn が空の場合 400 を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "admin-1", email: "admin@test.com", role: "admin" });

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/admin/announcements", {
      method: "PUT",
      body: JSON.stringify({ messageEn: "", messageSv: "Hej", active: true }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
  });

  it("messageSv が空の場合 400 を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "admin-1", email: "admin@test.com", role: "admin" });

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/admin/announcements", {
      method: "PUT",
      body: JSON.stringify({ messageEn: "Hello", messageSv: "", active: true }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
  });

  it("messageEn が500文字超の場合 400 を返す", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "admin-1", email: "admin@test.com", role: "admin" });

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/admin/announcements", {
      method: "PUT",
      body: JSON.stringify({ messageEn: "a".repeat(501), messageSv: "Hej", active: true }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
  });
});

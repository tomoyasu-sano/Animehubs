import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth-v2", () => ({
  auth: () => mockAuth(),
}));

const mockGetSubscriptionStatus = vi.fn();
vi.mock("@/lib/db/newsletter-queries", () => ({
  getSubscriptionStatus: (...args: unknown[]) => mockGetSubscriptionStatus(...args),
}));

describe("GET /api/newsletter/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未ログインの場合 subscribed: false を返す", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ subscribed: false });
  });

  it("ログイン済み＆未購読の場合 subscribed: false ��返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetSubscriptionStatus.mockResolvedValue(false);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ subscribed: false });
  });

  it("ログイ���済み＆購読済みの��合 subscribed: true を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetSubscriptionStatus.mockResolvedValue(true);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ subscribed: true });
  });
});

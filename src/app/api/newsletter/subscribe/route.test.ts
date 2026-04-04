import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth-v2", () => ({
  auth: () => mockAuth(),
}));

const mockSubscribeUser = vi.fn();
vi.mock("@/lib/db/newsletter-queries", () => ({
  subscribeUser: (...args: unknown[]) => mockSubscribeUser(...args),
}));

describe("POST /api/newsletter/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未ログインの場合 401 を返���", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ locale: "en" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("新規登録の場合 subscribed=true, alreadySubscribed=false を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockSubscribeUser.mockResolvedValue({ subscribed: true, alreadySubscribed: false });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ locale: "en" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ subscribed: true, alreadySubscribed: false });
    expect(mockSubscribeUser).toHaveBeenCalledWith("user-1", "en");
  });

  it("既登録の場合 alreadySubscribed=true を返���", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockSubscribeUser.mockResolvedValue({ subscribed: true, alreadySubscribed: true });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ locale: "sv" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ subscribed: true, alreadySubscribed: true });
  });

  it("無効な locale の場合 400 を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ locale: "fr" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});

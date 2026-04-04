import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyUnsubscribeToken = vi.fn();
vi.mock("@/lib/newsletter-token", () => ({
  verifyUnsubscribeToken: (...args: unknown[]) => mockVerifyUnsubscribeToken(...args),
}));

const mockUnsubscribeUser = vi.fn();
vi.mock("@/lib/db/newsletter-queries", () => ({
  unsubscribeUser: (...args: unknown[]) => mockUnsubscribeUser(...args),
}));

describe("GET /api/newsletter/unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEWSLETTER_HMAC_SECRET = "test-secret";
  });

  it("トークンがない場合 400 を返す", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/unsubscribe");
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it("無効なトークンの場合 400 を返す", async () => {
    mockVerifyUnsubscribeToken.mockReturnValue({ valid: false, reason: "invalid" });

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/unsubscribe?token=bad-token");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.reason).toBe("invalid");
  });

  it("期限切れトークンの場合 400 + reason=expired を返す", async () => {
    mockVerifyUnsubscribeToken.mockReturnValue({ valid: false, reason: "expired" });

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/unsubscribe?token=expired-token");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.reason).toBe("expired");
  });

  it("有効なトークンの場合、購読を解除して success を��す", async () => {
    mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, userId: "user-123" });
    mockUnsubscribeUser.mockResolvedValue({ success: true });

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/newsletter/unsubscribe?token=valid-token");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(mockUnsubscribeUser).toHaveBeenCalledWith("user-123");
  });
});

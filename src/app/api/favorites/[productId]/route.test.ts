import { describe, it, expect, vi, beforeEach } from "vitest";

// auth モック
const mockAuth = vi.fn();
vi.mock("@/lib/auth-v2", () => ({
  auth: () => mockAuth(),
}));

// favorite-queries モック
const mockRemoveFavorite = vi.fn();
vi.mock("@/lib/db/favorite-queries", () => ({
  removeFavorite: (...args: unknown[]) => mockRemoveFavorite(...args),
}));

describe("DELETE /api/favorites/[productId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(null);

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/favorites/00000000-0000-4000-8000-000000000001", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ productId: "00000000-0000-4000-8000-000000000001" }) });

    expect(response.status).toBe(401);
  });

  it("正常系: お気に入り削除成功で200を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRemoveFavorite.mockResolvedValue({ success: true });

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/favorites/00000000-0000-4000-8000-000000000001", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ productId: "00000000-0000-4000-8000-000000000001" }) });

    expect(response.status).toBe(200);
    expect(mockRemoveFavorite).toHaveBeenCalledWith("user-1", "00000000-0000-4000-8000-000000000001");
  });

  it("存在しないお気に入りの場合404を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRemoveFavorite.mockResolvedValue({ success: false, reason: "not_found" });

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/favorites/00000000-0000-4000-8000-000000000001", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ productId: "00000000-0000-4000-8000-000000000001" }) });

    expect(response.status).toBe(404);
  });
});

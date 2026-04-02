import { describe, it, expect, vi, beforeEach } from "vitest";

// auth モック
const mockAuth = vi.fn();
vi.mock("@/lib/auth-v2", () => ({
  auth: () => mockAuth(),
}));

// favorite-queries モック
const mockAddFavorite = vi.fn();
const mockGetUserFavorites = vi.fn();
vi.mock("@/lib/db/favorite-queries", () => ({
  addFavorite: (...args: unknown[]) => mockAddFavorite(...args),
  getUserFavorites: (...args: unknown[]) => mockGetUserFavorites(...args),
}));

// テスト対象は実装後にimport
// import { GET, POST } from "./route";

describe("GET /api/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("認証済みの場合、ユーザーのお気に入り一覧を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "test@example.com" } });
    mockGetUserFavorites.mockResolvedValue([
      {
        id: "fav-1",
        productId: "00000000-0000-4000-8000-000000000001",
        product: { id: "00000000-0000-4000-8000-000000000001", nameEn: "Figure A", price: 29900 },
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { productId: string }[];
    expect(body).toHaveLength(1);
    expect(body[0].productId).toBe("00000000-0000-4000-8000-000000000001");
  });
});

describe("POST /api/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "00000000-0000-4000-8000-000000000001" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("productIdが未指定の場合400を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("正常系: お気に入り追加成功で201を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAddFavorite.mockResolvedValue({ success: true });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "00000000-0000-4000-8000-000000000001" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockAddFavorite).toHaveBeenCalledWith("user-1", "00000000-0000-4000-8000-000000000001");
  });

  it("重複の場合409を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAddFavorite.mockResolvedValue({ success: false, reason: "already_exists" });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "00000000-0000-4000-8000-000000000001" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
  });
});

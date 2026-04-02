import { describe, it, expect, vi, beforeEach } from "vitest";

// auth-v2 の auth() をモック
vi.mock("./auth-v2", () => ({
  auth: vi.fn(),
}));

import { getAdminSession } from "./admin-auth";
import { auth } from "./auth-v2";

const mockAuth = vi.mocked(auth);

describe("admin-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAdminSession", () => {
    it("admin roleのセッションでAdminSessionを返す", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com", role: "admin" },
        expires: "2099-01-01",
      } as any);

      const result = await getAdminSession();
      expect(result).toEqual({
        userId: "user-1",
        email: "admin@example.com",
        role: "admin",
      });
    });

    it("user roleのセッションでnullを返す", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-2", email: "user@example.com", role: "user" },
        expires: "2099-01-01",
      } as any);

      const result = await getAdminSession();
      expect(result).toBeNull();
    });

    it("セッションなしでnullを返す", async () => {
      mockAuth.mockResolvedValue(null as any);

      const result = await getAdminSession();
      expect(result).toBeNull();
    });

    it("userがundefinedのセッションでnullを返す", async () => {
      mockAuth.mockResolvedValue({ expires: "2099-01-01" } as any);

      const result = await getAdminSession();
      expect(result).toBeNull();
    });

    it("roleが未設定のセッションでnullを返す", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-3", email: "test@example.com" },
        expires: "2099-01-01",
      } as any);

      const result = await getAdminSession();
      expect(result).toBeNull();
    });
  });
});

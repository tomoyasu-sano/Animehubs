import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// テスト用の環境変数を設定
const TEST_PASSWORD = "test-password";
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", "test-jwt-secret");
  vi.stubEnv("ADMIN_PASSWORD_HASH", TEST_HASH);
});

describe("auth", () => {
  describe("verifyAdminPassword", () => {
    it("正しいパスワードでtrueを返す", async () => {
      const { verifyAdminPassword } = await import("./auth");
      expect(await verifyAdminPassword(TEST_PASSWORD)).toBe(true);
    });

    it("間違ったパスワードでfalseを返す", async () => {
      const { verifyAdminPassword } = await import("./auth");
      expect(await verifyAdminPassword("wrong-password")).toBe(false);
    });

    it("空文字列でfalseを返す", async () => {
      const { verifyAdminPassword } = await import("./auth");
      expect(await verifyAdminPassword("")).toBe(false);
    });
  });

  describe("generateToken / verifyToken", () => {
    it("有効なトークンを生成し検証できる", async () => {
      const { generateToken, verifyToken } = await import("./auth");
      const token = generateToken();

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.role).toBe("admin");
    });

    it("無効なトークンでnullを返す", async () => {
      const { verifyToken } = await import("./auth");
      expect(verifyToken("invalid-token")).toBeNull();
    });

    it("空のトークンでnullを返す", async () => {
      const { verifyToken } = await import("./auth");
      expect(verifyToken("")).toBeNull();
    });
  });
});

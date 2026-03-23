import { describe, it, expect } from "vitest";
import {
  verifyAdminPassword,
  generateToken,
  verifyToken,
} from "./auth";

describe("auth", () => {
  describe("verifyAdminPassword", () => {
    it("正しいパスワードでtrueを返す", () => {
      // デフォルトのパスワード（環境変数未設定時）
      expect(verifyAdminPassword("animehubs-admin")).toBe(true);
    });

    it("間違ったパスワードでfalseを返す", () => {
      expect(verifyAdminPassword("wrong-password")).toBe(false);
    });

    it("空文字列でfalseを返す", () => {
      expect(verifyAdminPassword("")).toBe(false);
    });
  });

  describe("generateToken / verifyToken", () => {
    it("有効なトークンを生成し検証できる", () => {
      const token = generateToken();

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.role).toBe("admin");
    });

    it("無効なトークンでnullを返す", () => {
      expect(verifyToken("invalid-token")).toBeNull();
    });

    it("空のトークンでnullを返す", () => {
      expect(verifyToken("")).toBeNull();
    });
  });
});

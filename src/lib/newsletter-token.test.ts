import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "./newsletter-token";

describe("newsletter-token", () => {
  const MOCK_SECRET = "test-hmac-secret-key-for-newsletter";

  // ============================================================
  // generateUnsubscribeToken
  // ============================================================
  describe("generateUnsubscribeToken", () => {
    it("有効なトークンを生成する", () => {
      const token = generateUnsubscribeToken("user-123", MOCK_SECRET);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      // Base64URL encoded payload + "." + signature
      expect(token).toContain(".");
    });

    it("同じユーザーでも毎回異なるトークンを生成する（有効期限が異なる）", () => {
      const token1 = generateUnsubscribeToken("user-123", MOCK_SECRET);

      // 少し時間を進める
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      const token2 = generateUnsubscribeToken("user-123", MOCK_SECRET);
      vi.useRealTimers();

      // 時間が異なるので異なるトークンになる
      expect(token1).not.toBe(token2);
    });

    it("userIdが空の場合はエラー", () => {
      expect(() => generateUnsubscribeToken("", MOCK_SECRET)).toThrow();
    });

    it("secretが空の場合はエラー", () => {
      expect(() => generateUnsubscribeToken("user-123", "")).toThrow();
    });
  });

  // ============================================================
  // verifyUnsubscribeToken
  // ============================================================
  describe("verifyUnsubscribeToken", () => {
    it("正常なトークンを検証してuserIdを返す", () => {
      const token = generateUnsubscribeToken("user-123", MOCK_SECRET);
      const result = verifyUnsubscribeToken(token, MOCK_SECRET);

      expect(result).toEqual({ valid: true, userId: "user-123" });
    });

    it("期限切れトークンは expired を返す", () => {
      vi.useFakeTimers();
      const token = generateUnsubscribeToken("user-123", MOCK_SECRET);

      // 31日後に進める（有効期限30日を超過）
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
      const result = verifyUnsubscribeToken(token, MOCK_SECRET);
      vi.useRealTimers();

      expect(result).toEqual({ valid: false, reason: "expired" });
    });

    it("改竄されたトークンは invalid を返す", () => {
      const token = generateUnsubscribeToken("user-123", MOCK_SECRET);
      // ペイロード部分を改竄
      const [, signature] = token.split(".");
      const tamperedPayload = Buffer.from("user-999:9999999999").toString("base64url");
      const tamperedToken = `${tamperedPayload}.${signature}`;

      const result = verifyUnsubscribeToken(tamperedToken, MOCK_SECRET);

      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("不正なsecretで検証すると invalid を返す", () => {
      const token = generateUnsubscribeToken("user-123", MOCK_SECRET);
      const result = verifyUnsubscribeToken(token, "wrong-secret");

      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("不正な形式のトークンは invalid を返す", () => {
      const result = verifyUnsubscribeToken("invalid-token", MOCK_SECRET);
      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("空のトークンは invalid を返す", () => {
      const result = verifyUnsubscribeToken("", MOCK_SECRET);
      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("有効期限内（29日後）は正常に検証できる", () => {
      vi.useFakeTimers();
      const token = generateUnsubscribeToken("user-123", MOCK_SECRET);

      // 29日後に進める（まだ有効）
      vi.advanceTimersByTime(29 * 24 * 60 * 60 * 1000);
      const result = verifyUnsubscribeToken(token, MOCK_SECRET);
      vi.useRealTimers();

      expect(result).toEqual({ valid: true, userId: "user-123" });
    });
  });
});

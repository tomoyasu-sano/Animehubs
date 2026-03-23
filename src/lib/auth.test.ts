import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} from "./auth";

describe("auth", () => {
  describe("hashPassword / verifyPassword", () => {
    it("should hash and verify a password correctly", () => {
      const password = "testPassword123";
      const hash = hashPassword(password);

      expect(hash).not.toBe(password);
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it("should return false for incorrect password", () => {
      const hash = hashPassword("correct");
      expect(verifyPassword("wrong", hash)).toBe(false);
    });

    it("should generate different hashes for same password", () => {
      const password = "samePassword";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    });
  });

  describe("generateToken / verifyToken", () => {
    it("should generate a valid token and verify it", () => {
      const payload = { userId: "user-1", username: "admin1" };
      const token = generateToken(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe("user-1");
      expect(decoded!.username).toBe("admin1");
    });

    it("should return null for invalid token", () => {
      expect(verifyToken("invalid-token")).toBeNull();
    });

    it("should return null for empty token", () => {
      expect(verifyToken("")).toBeNull();
    });
  });
});

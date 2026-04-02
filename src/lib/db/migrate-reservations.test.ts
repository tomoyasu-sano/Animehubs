import { describe, it, expect } from "vitest";
import {
  mapReservationStatus,
  generateOrderNumber,
  MIGRATION_USER_EMAIL,
} from "./migrate-reservations";

describe("migrate-reservations", () => {
  describe("mapReservationStatus", () => {
    it("'completed' は 'completed' にマッピングされる", () => {
      expect(mapReservationStatus("completed")).toBe("completed");
    });

    it("'cancelled' は 'cancelled' にマッピングされる", () => {
      expect(mapReservationStatus("cancelled")).toBe("cancelled");
    });

    it("'pending' は 'completed' にマッピングされる（旧データは完了扱い）", () => {
      expect(mapReservationStatus("pending")).toBe("completed");
    });

    it("'confirmed' は 'completed' にマッピングされる", () => {
      expect(mapReservationStatus("confirmed")).toBe("completed");
    });

    it("未知のステータスは 'completed' にマッピングされる", () => {
      expect(mapReservationStatus("unknown")).toBe("completed");
    });
  });

  describe("generateOrderNumber", () => {
    it("正しいフォーマット AH-YYYYMMDD-NNNN で生成される", () => {
      const result = generateOrderNumber("2026-03-31", 1);
      expect(result).toBe("AH-20260331-0001");
    });

    it("連番が4桁ゼロパディングされる", () => {
      expect(generateOrderNumber("2026-03-31", 42)).toBe("AH-20260331-0042");
      expect(generateOrderNumber("2026-03-31", 999)).toBe("AH-20260331-0999");
      expect(generateOrderNumber("2026-03-31", 1234)).toBe("AH-20260331-1234");
    });

    it("日付のハイフンが除去される", () => {
      const result = generateOrderNumber("2026-04-01", 5);
      expect(result).toBe("AH-20260401-0005");
    });
  });

  describe("MIGRATION_USER_EMAIL", () => {
    it("移行用ユーザーメールが定義されている", () => {
      expect(MIGRATION_USER_EMAIL).toBe("migration@animehubs.se");
    });
  });
});

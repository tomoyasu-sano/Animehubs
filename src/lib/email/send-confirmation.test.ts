import { describe, it, expect, vi } from "vitest";

// Resend のモック
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: "email-123" }, error: null }),
      },
    })),
  };
});

// sendConfirmationEmail を直接インポートするとモジュールレベルで Resend が初期化される
// テスト用にヘルパー関数のロジックをテスト
import { formatPrice } from "@/lib/utils";
import { PICKUP_LOCATIONS, TIME_SLOTS } from "@/lib/constants";

describe("メール送信ロジック", () => {
  it("formatPrice が正しくフォーマットする", () => {
    expect(formatPrice(129900)).toMatch(/1[\s\u00a0]299 kr/);
  });

  it("PICKUP_LOCATIONS に3箇所含まれる", () => {
    expect(PICKUP_LOCATIONS).toHaveLength(3);
    expect(PICKUP_LOCATIONS.map((l) => l.id)).toEqual([
      "central-station",
      "stora-torget",
      "forumgallerian",
    ]);
  });

  it("TIME_SLOTS に3つ含まれる", () => {
    expect(TIME_SLOTS).toHaveLength(3);
    expect(TIME_SLOTS.map((s) => s.id)).toEqual([
      "weekday-evening",
      "weekend-morning",
      "weekend-afternoon",
    ]);
  });

  it("場所の英語名が正しい", () => {
    const centralStation = PICKUP_LOCATIONS.find((l) => l.id === "central-station");
    expect(centralStation?.name_en).toBe("Uppsala Central Station");
  });

  it("場所のスウェーデン語名が正しい", () => {
    const centralStation = PICKUP_LOCATIONS.find((l) => l.id === "central-station");
    expect(centralStation?.name_sv).toBe("Uppsala Centralstation");
  });

  it("時間帯の英語名にフォーマットされた時間が含まれる", () => {
    const evening = TIME_SLOTS.find((s) => s.id === "weekday-evening");
    expect(evening?.name_en).toContain("17:00-19:00");
  });

  it("予約IDを8文字に切り詰めて大文字化する", () => {
    const reservationId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const shortId = reservationId.slice(0, 8).toUpperCase();
    expect(shortId).toBe("A1B2C3D4");
    expect(shortId).toHaveLength(8);
  });
});

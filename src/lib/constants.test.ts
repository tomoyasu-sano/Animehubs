import { describe, it, expect } from "vitest";
import {
  PICKUP_LOCATIONS,
  TIME_SLOTS,
  CATEGORIES,
  CONDITIONS,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LOCALES,
  DEFAULT_LOCALE,
} from "./constants";

describe("PICKUP_LOCATIONS", () => {
  it("3箇所の受け渡し場所を持つ", () => {
    expect(PICKUP_LOCATIONS).toHaveLength(3);
  });

  it("各場所にid, name_en, name_svを持つ", () => {
    for (const location of PICKUP_LOCATIONS) {
      expect(location).toHaveProperty("id");
      expect(location).toHaveProperty("name_en");
      expect(location).toHaveProperty("name_sv");
      expect(typeof location.id).toBe("string");
      expect(typeof location.name_en).toBe("string");
      expect(typeof location.name_sv).toBe("string");
    }
  });
});

describe("TIME_SLOTS", () => {
  it("3つの時間帯を持つ", () => {
    expect(TIME_SLOTS).toHaveLength(3);
  });

  it("各時間帯にid, name_en, name_svを持つ", () => {
    for (const slot of TIME_SLOTS) {
      expect(slot).toHaveProperty("id");
      expect(slot).toHaveProperty("name_en");
      expect(slot).toHaveProperty("name_sv");
    }
  });
});

describe("CATEGORIES", () => {
  it("4つのカテゴリを持つ", () => {
    expect(CATEGORIES).toHaveLength(4);
  });

  it("全カテゴリに表示ラベルがある", () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeDefined();
      expect(CATEGORY_LABELS[category].en).toBeTruthy();
      expect(CATEGORY_LABELS[category].sv).toBeTruthy();
    }
  });
});

describe("CONDITIONS", () => {
  it("4つのコンディションを持つ", () => {
    expect(CONDITIONS).toHaveLength(4);
  });

  it("全コンディションに表示ラベルがある", () => {
    for (const condition of CONDITIONS) {
      expect(CONDITION_LABELS[condition]).toBeDefined();
      expect(CONDITION_LABELS[condition].en).toBeTruthy();
      expect(CONDITION_LABELS[condition].sv).toBeTruthy();
    }
  });
});

describe("LOCALES", () => {
  it("en, svの2ロケールを持つ", () => {
    expect(LOCALES).toEqual(["en", "sv"]);
  });

  it("デフォルトロケールはen", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

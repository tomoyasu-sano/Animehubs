import { describe, it, expect } from "vitest";
import { formatPrice, generateSlug, getLocalizedField, cn } from "./utils";

describe("formatPrice", () => {
  it("オーレ単位の価格をSEK形式でフォーマットする", () => {
    expect(formatPrice(189900)).toBe("1\u00a0899 kr"); // 1 899 kr (non-breaking space)
  });

  it("0円をフォーマットする", () => {
    expect(formatPrice(0)).toBe("0 kr");
  });

  it("小さい金額をフォーマットする", () => {
    expect(formatPrice(9900)).toBe("99 kr");
  });

  it("大きい金額をフォーマットする", () => {
    expect(formatPrice(999900)).toBe("9\u00a0999 kr");
  });
});

describe("generateSlug", () => {
  it("スペースをハイフンに変換する", () => {
    expect(generateSlug("hello world")).toBe("hello-world");
  });

  it("特殊文字を除去する", () => {
    expect(generateSlug("Re:Zero!")).toBe("rezero");
  });

  it("大文字を小文字に変換する", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("連続するハイフンを1つにまとめる", () => {
    expect(generateSlug("hello---world")).toBe("hello-world");
  });

  it("先頭・末尾のハイフンを除去する", () => {
    expect(generateSlug("-hello-")).toBe("hello");
  });
});

describe("getLocalizedField", () => {
  it("snake_case キーで指定ロケールのフィールドを返す", () => {
    const item = { name_en: "English Name", name_sv: "Swedish Name" };
    expect(getLocalizedField(item, "name", "en")).toBe("English Name");
    expect(getLocalizedField(item, "name", "sv")).toBe("Swedish Name");
  });

  it("camelCase キーで指定ロケールのフィールドを返す", () => {
    const item = { nameEn: "English Name", nameSv: "Swedish Name", descriptionEn: "Desc" };
    expect(getLocalizedField(item, "name", "en")).toBe("English Name");
    expect(getLocalizedField(item, "name", "sv")).toBe("Swedish Name");
    expect(getLocalizedField(item, "description", "en")).toBe("Desc");
  });

  it("指定ロケールがない場合は英語にフォールバックする", () => {
    const item = { description_en: "English Description" };
    expect(getLocalizedField(item, "description", "sv")).toBe("English Description");
  });

  it("camelCaseで英語にフォールバックする", () => {
    const item = { descriptionEn: "English Description" };
    expect(getLocalizedField(item, "description", "sv")).toBe("English Description");
  });

  it("どちらもない場合は空文字を返す", () => {
    const item = { name_en: "test" };
    expect(getLocalizedField(item, "nonexistent", "en")).toBe("");
  });
});

describe("cn", () => {
  it("クラス名を結合する", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("falsy値を無視する", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });
});

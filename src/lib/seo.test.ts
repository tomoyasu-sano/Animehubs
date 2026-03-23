import { describe, it, expect } from "vitest";
import {
  getSiteUrl,
  generatePageMetadata,
  generateProductJsonLd,
  generateWebSiteJsonLd,
  generateLocalBusinessJsonLd,
} from "./seo";

describe("SEO ユーティリティ", () => {
  describe("getSiteUrl", () => {
    it("サイトURLを返す", () => {
      const url = getSiteUrl();
      expect(url).toBeDefined();
      expect(typeof url).toBe("string");
      expect(url.startsWith("http")).toBe(true);
    });
  });

  describe("generatePageMetadata", () => {
    it("正しいメタデータを生成する（英語）", () => {
      const metadata = generatePageMetadata({
        title: "Test Page",
        description: "Test description",
        locale: "en",
        path: "/test",
      });

      expect(metadata.title).toBe("Test Page");
      expect(metadata.description).toBe("Test description");
      expect(metadata.alternates?.canonical).toContain("/en/test");
      expect(metadata.openGraph?.locale).toBe("en_US");
      expect(metadata.openGraph?.alternateLocale).toBe("sv_SE");
    });

    it("正しいメタデータを生成する（スウェーデン語）", () => {
      const metadata = generatePageMetadata({
        title: "Test Sida",
        description: "Test beskrivning",
        locale: "sv",
        path: "/test",
      });

      expect(metadata.openGraph?.locale).toBe("sv_SE");
      expect(metadata.openGraph?.alternateLocale).toBe("en_US");
      expect(metadata.alternates?.canonical).toContain("/sv/test");
    });

    it("noIndex がtrueの場合、robotsをnoindex/nofollowに設定する", () => {
      const metadata = generatePageMetadata({
        title: "Private Page",
        description: "Private description",
        locale: "en",
        noIndex: true,
      });

      const robots = metadata.robots as { index: boolean; follow: boolean };
      expect(robots.index).toBe(false);
      expect(robots.follow).toBe(false);
    });

    it("カスタム画像を設定できる", () => {
      const customImages = [
        { url: "https://example.com/img.png", width: 800, height: 600, alt: "test" },
      ];
      const metadata = generatePageMetadata({
        title: "Test",
        description: "Test",
        locale: "en",
        images: customImages,
      });

      expect(metadata.openGraph?.images).toEqual(customImages);
    });

    it("alternates.languages に en/sv の両方を含む", () => {
      const metadata = generatePageMetadata({
        title: "Test",
        description: "Test",
        locale: "en",
        path: "/products",
      });

      const languages = metadata.alternates?.languages as Record<string, string>;
      expect(languages.en).toContain("/en/products");
      expect(languages.sv).toContain("/sv/products");
    });
  });

  describe("generateProductJsonLd", () => {
    it("正しいJSON-LDを生成する（在庫あり）", () => {
      const jsonLd = generateProductJsonLd({
        name: "Test Figure",
        description: "A great figure",
        price: 129900,
        condition: "new",
        images: ["/images/test.jpg"],
        url: "https://animehubs.se/en/products/123",
        inStock: true,
      });

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("Product");
      expect(jsonLd.name).toBe("Test Figure");
      expect(jsonLd.offers["@type"]).toBe("Offer");
      expect(jsonLd.offers.price).toBe("1299.00");
      expect(jsonLd.offers.priceCurrency).toBe("SEK");
      expect(jsonLd.offers.availability).toBe("https://schema.org/InStock");
      expect(jsonLd.offers.itemCondition).toBe("https://schema.org/NewCondition");
    });

    it("在庫切れの場合にOutOfStockを設定する", () => {
      const jsonLd = generateProductJsonLd({
        name: "Test Figure",
        description: "A great figure",
        price: 50000,
        condition: "good",
        images: [],
        url: "https://animehubs.se/en/products/456",
        inStock: false,
      });

      expect(jsonLd.offers.availability).toBe("https://schema.org/OutOfStock");
      expect(jsonLd.offers.itemCondition).toBe("https://schema.org/UsedCondition");
    });

    it("相対パスの画像URLをフルURLに変換する", () => {
      const jsonLd = generateProductJsonLd({
        name: "Test",
        description: "Test",
        price: 10000,
        condition: "new",
        images: ["/images/test.jpg", "https://cdn.example.com/img.jpg"],
        url: "https://animehubs.se/en/products/789",
        inStock: true,
      });

      expect(jsonLd.image[0]).toContain("https://");
      expect(jsonLd.image[0]).toContain("/images/test.jpg");
      expect(jsonLd.image[1]).toBe("https://cdn.example.com/img.jpg");
    });
  });

  describe("generateWebSiteJsonLd", () => {
    it("正しいWebSite構造化データを生成する", () => {
      const jsonLd = generateWebSiteJsonLd();

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("WebSite");
      expect(jsonLd.name).toBe("AnimeHubs");
      expect(jsonLd.potentialAction["@type"]).toBe("SearchAction");
    });
  });

  describe("generateLocalBusinessJsonLd", () => {
    it("正しいStore構造化データを生成する", () => {
      const jsonLd = generateLocalBusinessJsonLd();

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("Store");
      expect(jsonLd.name).toBe("AnimeHubs");
      expect(jsonLd.address.addressLocality).toBe("Uppsala");
      expect(jsonLd.address.addressCountry).toBe("SE");
    });
  });
});

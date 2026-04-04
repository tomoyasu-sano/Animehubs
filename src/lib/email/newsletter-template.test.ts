import { describe, it, expect } from "vitest";
import { buildNewsletterEmailHtml } from "./newsletter-template";

describe("buildNewsletterEmailHtml", () => {
  const baseInput = {
    body: "Check out our new items!",
    unsubscribeUrl: "https://animehubs.se/en/unsubscribe?token=abc",
    shopUrl: "https://animehubs.se/en",
  };

  it("基本的なHTMLメールを生成する", () => {
    const html = buildNewsletterEmailHtml(baseInput);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("AnimeHubs");
    expect(html).toContain("Check out our new items!");
    expect(html).toContain("Shop Now");
    expect(html).toContain("https://animehubs.se/en");
    expect(html).toContain("Unsubscribe");
    expect(html).toContain("https://animehubs.se/en/unsubscribe?token=abc");
  });

  it("商品リストを含むメールを生成する", () => {
    const html = buildNewsletterEmailHtml({
      ...baseInput,
      products: [
        {
          nameEn: "Naruto Figure",
          price: 29900,
          imageUrl: "https://example.com/naruto.jpg",
          productUrl: "https://animehubs.se/en/products/p1",
        },
        {
          nameEn: "One Piece Keychain",
          price: 9900,
          imageUrl: "https://example.com/onepiece.jpg",
          productUrl: "https://animehubs.se/en/products/p2",
        },
      ],
    });

    expect(html).toContain("Naruto Figure");
    expect(html).toContain("One Piece Keychain");
    expect(html).toContain("299");
    expect(html).toContain("99");
    expect(html).toContain("New Arrivals");
  });

  it("商品リストが空の場合は New Arrivals セクションを含まない", () => {
    const html = buildNewsletterEmailHtml({
      ...baseInput,
      products: [],
    });

    expect(html).not.toContain("New Arrivals");
  });

  it("商品リストを渡さない場合も正常に動作する", () => {
    const html = buildNewsletterEmailHtml(baseInput);

    expect(html).not.toContain("New Arrivals");
  });

  it("XSS対策: HTMLエスケープされる", () => {
    const html = buildNewsletterEmailHtml({
      ...baseInput,
      body: '<script>alert("xss")</script>',
      products: [
        {
          nameEn: '<img src=x onerror="alert(1)">',
          price: 100,
          imageUrl: "https://example.com/img.jpg",
          productUrl: "https://animehubs.se/en/products/p1",
        },
      ],
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("&lt;script&gt;");
  });

  it("Uppsala, Sweden のフッターを含む", () => {
    const html = buildNewsletterEmailHtml(baseInput);

    expect(html).toContain("Uppsala, Sweden");
  });
});

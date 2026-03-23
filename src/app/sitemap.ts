import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/db/queries";
import { initializeDatabase } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const locales = ["en", "sv"];
  const now = new Date();

  // 静的ページ
  const staticPages = ["", "/products", "/cart", "/checkout", "/privacy"];

  const staticEntries: MetadataRoute.Sitemap = staticPages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${page}`,
      lastModified: now,
      changeFrequency: page === "" ? ("daily" as const) : ("weekly" as const),
      priority: page === "" ? 1.0 : page === "/products" ? 0.9 : 0.5,
    }))
  );

  // 動的ページ（商品詳細）
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    initializeDatabase();
    const { items: allProducts } = getProducts({});
    productEntries = allProducts.flatMap((product) =>
      locales.map((locale) => ({
        url: `${siteUrl}/${locale}/products/${product.id}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
    );
  } catch {
    // DB未初期化時はスキップ
  }

  return [...staticEntries, ...productEntries];
}

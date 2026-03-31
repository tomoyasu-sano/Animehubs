import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/db/queries";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const locales = ["en", "sv"];
  const now = new Date();

  const staticPages = ["", "/products", "/cart", "/checkout", "/privacy"];

  const staticEntries: MetadataRoute.Sitemap = staticPages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${page}`,
      lastModified: now,
      changeFrequency: page === "" ? ("daily" as const) : ("weekly" as const),
      priority: page === "" ? 1.0 : page === "/products" ? 0.9 : 0.5,
    }))
  );

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const { items: allProducts } = await getProducts({});
    productEntries = allProducts.flatMap((product) =>
      locales.map((locale) => ({
        url: `${siteUrl}/${locale}/products/${product.id}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
    );
  } catch {
    // DB未接続時はスキップ
  }

  return [...staticEntries, ...productEntries];
}

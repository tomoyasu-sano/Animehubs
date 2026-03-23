import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://animehubs.se";
const SITE_NAME = "AnimeHubs";

/**
 * ベースURL を返す
 */
export function getSiteUrl(): string {
  return SITE_URL;
}

/**
 * ページごとのメタデータを生成
 */
export function generatePageMetadata({
  title,
  description,
  locale,
  path = "",
  images,
  noIndex = false,
}: {
  title: string;
  description: string;
  locale: string;
  path?: string;
  images?: { url: string; width: number; height: number; alt: string }[];
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}/${locale}${path}`;

  const defaultImage = {
    url: `${SITE_URL}/og-default.png`,
    width: 1200,
    height: 630,
    alt: SITE_NAME,
  };

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}/en${path}`,
        sv: `${SITE_URL}/sv${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: locale === "sv" ? "sv_SE" : "en_US",
      alternateLocale: locale === "sv" ? "en_US" : "sv_SE",
      type: "website",
      images: images || [defaultImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((img) => img.url) || [defaultImage.url],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/**
 * 商品ページ用のJSON-LD構造化データ (Product)
 */
export function generateProductJsonLd({
  name,
  description,
  price,
  currency = "SEK",
  condition,
  images,
  url,
  inStock,
}: {
  name: string;
  description: string;
  price: number;
  currency?: string;
  condition: string;
  images: string[];
  url: string;
  inStock: boolean;
}) {
  const conditionMap: Record<string, string> = {
    new: "https://schema.org/NewCondition",
    like_new: "https://schema.org/UsedCondition",
    good: "https://schema.org/UsedCondition",
    fair: "https://schema.org/UsedCondition",
  };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: images.map((img) =>
      img.startsWith("http") ? img : `${SITE_URL}${img}`
    ),
    url,
    offers: {
      "@type": "Offer",
      price: (price / 100).toFixed(2),
      priceCurrency: currency,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: conditionMap[condition] || "https://schema.org/UsedCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };
}

/**
 * WebSite用のJSON-LD構造化データ
 */
export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Hand-picked anime collectibles from Japan, available for local pickup in Uppsala, Sweden.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/en/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * LocalBusiness用のJSON-LD構造化データ
 */
export function generateLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: SITE_NAME,
    description:
      "Premium anime figures and collectibles, available for local pickup in Uppsala, Sweden.",
    url: SITE_URL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Uppsala",
      addressCountry: "SE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 59.8586,
      longitude: 17.6389,
    },
    priceRange: "$$",
  };
}

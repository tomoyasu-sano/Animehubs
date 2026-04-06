import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductById } from "@/lib/db/queries";
import { formatPrice, getLocalizedField, parseImages } from "@/lib/utils";
import { CATEGORY_LABELS, CONDITION_LABELS, type Category, type Condition } from "@/lib/constants";
import ProductGallery from "@/components/products/ProductGallery";
import ProductDetailActions from "./ProductDetailActions";
import { generatePageMetadata, generateProductJsonLd, getSiteUrl } from "@/lib/seo";
import type { Metadata } from "next";

interface ProductDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { id, locale } = await params;

  const product = await getProductById(id);

  if (!product) {
    return { title: "Not Found" };
  }

  const name = getLocalizedField(product, "name", locale);
  const description = getLocalizedField(product, "description", locale);
  const images = parseImages(product.images);
  const siteUrl = getSiteUrl();

  return generatePageMetadata({
    title: `${name} - AnimeHubs`,
    description: description.slice(0, 160),
    locale,
    path: `/products/${id}`,
    images: images.length > 0
      ? [
          {
            url: images[0].startsWith("http") ? images[0] : `${siteUrl}${images[0]}`,
            width: 1200,
            height: 630,
            alt: name,
          },
        ]
      : undefined,
  });
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  const name = getLocalizedField(product, "name", locale);
  const description = getLocalizedField(product, "description", locale);
  const images = parseImages(product.images);
  const categoryLabel =
    CATEGORY_LABELS[product.category as Category]?.[locale as "en" | "sv"] || product.category;
  const conditionLabel =
    CONDITION_LABELS[product.condition as Condition]?.[locale as "en" | "sv"] || product.condition;

  const siteUrl = getSiteUrl();
  const productJsonLd = generateProductJsonLd({
    name,
    description,
    price: product.price,
    condition: product.condition,
    images,
    url: `${siteUrl}/${locale}/products/${id}`,
    inStock: product.stock - product.reservedStock > 0,
  });

  return (
    <>
      {/* JSON-LD 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />

      {/* モバイル: フルブリード画像（ヘッダー裏まで広がる） */}
      <div className="-mt-16 md:hidden">
        <ProductGallery images={images} alt={name} fullBleed />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 md:py-16 lg:px-8 lg:py-24">
        {/* 戻るリンク（デスクトップのみ上に表示） */}
        <Link
          href="/products"
          className="mb-6 hidden items-center gap-1 text-sm text-muted transition-colors hover:text-foreground md:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.products")}
        </Link>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          {/* 画像ギャラリー（デスクトップ: 通常表示） */}
          <div className="hidden md:block">
            <ProductGallery images={images} alt={name} />
          </div>

          {/* 商品情報 */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{name}</h1>
              <p className="mt-2 text-2xl font-bold text-foreground md:mt-3 md:text-3xl">{formatPrice(product.price)}</p>
            </div>

            {/* アクションボタン（カート追加 + お気に入り） */}
            <ProductDetailActions product={product} />

            {/* メタ情報 */}
            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{t("products.category")}</span>
                <span className="text-sm text-foreground">{categoryLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{t("products.condition")}</span>
                <span className="text-sm text-foreground">{conditionLabel}</span>
              </div>
              {typeof product.heightCm === "number" && product.heightCm > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{t("products.height")}</span>
                  <span className="text-sm text-foreground">{product.heightCm} cm</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{t("products.inStock")}</span>
                <span className="text-sm text-foreground">{product.stock - product.reservedStock}</span>
              </div>
            </div>

            {/* 説明文 */}
            <div className="border-t border-border pt-6">
              <h2 className="mb-3 text-lg font-semibold text-foreground">{t("products.description")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{description}</p>
            </div>

            {/* モバイル: 戻るリンク */}
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.products")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

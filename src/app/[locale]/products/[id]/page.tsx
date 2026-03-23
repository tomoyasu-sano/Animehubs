import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductById } from "@/lib/db/queries";
import { initializeDatabase } from "@/lib/db";
import { formatPrice, getLocalizedField } from "@/lib/utils";
import { CATEGORY_LABELS, CONDITION_LABELS, type Category, type Condition } from "@/lib/constants";
import ProductGallery from "@/components/products/ProductGallery";
import ProductDetailActions from "./ProductDetailActions";

interface ProductDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;

  initializeDatabase();

  const product = getProductById(id);
  if (!product) {
    notFound();
  }

  const name = getLocalizedField(product, "name", locale);
  const description = getLocalizedField(product, "description", locale);
  const images: string[] = JSON.parse(product.images);
  const categoryLabel =
    CATEGORY_LABELS[product.category as Category]?.[locale as "en" | "sv"] || product.category;
  const conditionLabel =
    CONDITION_LABELS[product.condition as Condition]?.[locale as "en" | "sv"] || product.condition;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 戻るリンク */}
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.products")}
      </Link>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* 画像ギャラリー */}
        <ProductGallery images={images} alt={name} />

        {/* 商品情報 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{name}</h1>
            <p className="mt-3 text-3xl font-bold text-foreground">{formatPrice(product.price)}</p>
          </div>

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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{t("products.inStock")}</span>
              <span className="text-sm text-foreground">{product.stock}</span>
            </div>
          </div>

          {/* アクションボタン（カート追加 + お気に入り） */}
          <ProductDetailActions product={product} />

          {/* 説明文 */}
          <div className="border-t border-border pt-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">{t("products.description")}</h2>
            <p className="text-sm leading-relaxed text-muted">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

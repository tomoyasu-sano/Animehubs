import { getTranslations } from "next-intl/server";
import { getProducts } from "@/lib/db/queries";
import ProductGrid from "@/components/products/ProductGrid";
import ProductSearch from "@/components/products/ProductSearch";
import CategoryFilter from "@/components/products/CategoryFilter";
import { generatePageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Metadata } from "next";

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return generatePageMetadata({
    title: t("productsTitle"),
    description: t("productsDescription"),
    locale,
    path: "/products",
  });
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const t = await getTranslations();
  const params = await searchParams;

  const { items: productsList, total } = await getProducts({
    search: params.q,
    category: params.category,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 sm:py-10 lg:px-8">
      {/* フィルターバー: カテゴリアイコン + 検索 + 件数を1行に */}
      <div className="mb-6 flex items-center gap-2">
        <Suspense fallback={
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-full sm:w-20" />
            ))}
          </div>
        }>
          <CategoryFilter />
        </Suspense>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <span className="text-xs text-muted whitespace-nowrap">{total} {t("products.items")}</span>
          <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
            <ProductSearch />
          </Suspense>
        </div>
      </div>

      {/* 商品グリッド */}
      <ProductGrid products={productsList} />
    </div>
  );
}

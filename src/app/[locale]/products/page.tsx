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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ページヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("products.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {total} {t("products.items")}
        </p>
      </div>

      {/* 検索・フィルター */}
      <div className="mb-8 space-y-4">
        <Suspense fallback={<Skeleton className="h-10 w-full rounded-lg" />}>
          <ProductSearch />
        </Suspense>
        <Suspense fallback={
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        }>
          <CategoryFilter />
        </Suspense>
      </div>

      {/* 商品グリッド */}
      <ProductGrid products={productsList} />
    </div>
  );
}

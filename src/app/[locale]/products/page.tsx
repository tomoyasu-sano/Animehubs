import { getTranslations } from "next-intl/server";
import { getProducts } from "@/lib/db/queries";
import { initializeDatabase } from "@/lib/db";
import ProductGrid from "@/components/products/ProductGrid";
import ProductSearch from "@/components/products/ProductSearch";
import CategoryFilter from "@/components/products/CategoryFilter";
import { Suspense } from "react";

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const t = await getTranslations();
  const params = await searchParams;

  // DB初期化（テーブルが無い場合に作成）
  initializeDatabase();

  const { items: productsList, total } = getProducts({
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
        <Suspense fallback={null}>
          <ProductSearch />
        </Suspense>
        <Suspense fallback={null}>
          <CategoryFilter />
        </Suspense>
      </div>

      {/* 商品グリッド */}
      <ProductGrid products={productsList} />
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { getProducts } from "@/lib/db/queries";
import { initializeDatabase } from "@/lib/db";
import ProductGrid from "@/components/products/ProductGrid";

export default async function HomePage() {
  const t = await getTranslations();

  // DB初期化（テーブルが無い場合に作成）
  initializeDatabase();

  // 注目商品を取得
  const { items: featuredProducts } = getProducts({ featured: true, limit: 6 });

  return (
    <div>
      {/* ヒーローセクション */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-10">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-accent"
            >
              {t("home.browseAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 注目商品セクション */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{t("home.featuredTitle")}</h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-white"
          >
            {t("home.viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ProductGrid products={featuredProducts} />
      </section>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { getProducts } from "@/lib/db/queries";
import ProductGrid from "@/components/products/ProductGrid";
import AnnouncementBanner from "@/components/newsletter/AnnouncementBanner";
import { getActiveAnnouncement } from "@/lib/db/announcement-queries";
import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return generatePageMetadata({
    title: t("homeTitle"),
    description: t("homeDescription"),
    locale,
  });
}

export default async function HomePage() {
  const t = await getTranslations();

  const [{ items: featuredProducts }, announcement] = await Promise.all([
    getProducts({ featured: true, limit: 6 }),
    getActiveAnnouncement(),
  ]);

  return (
    <div>
      {/* 告知バナー */}
      <AnnouncementBanner announcement={announcement} />

      {/* ヒーローセクション */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-800 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05)_0%,_transparent_70%)]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-300 sm:text-xl">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-10">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
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
          <h2 className="text-2xl font-bold text-foreground">{t("home.featuredTitle")}</h2>
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

import { getTranslations } from "next-intl/server";
import Image from "next/image";
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
    <div className="-mt-16">
      {/* 告知バナー */}
      <AnnouncementBanner announcement={announcement} />

      {/* ヒーローセクション（ヘッダーの裏に潜り込む） */}
      <section className="relative flex aspect-square w-full items-center justify-center overflow-hidden sm:aspect-[3/1]">
        {/* 背景画像 */}
        <Image
          src="/images/hero/hero_image_01.png"
          alt="Anime figure collection display"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* グラデーションオーバーレイ（テキスト可読性確保） */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <p className="text-lg font-light tracking-wide text-white drop-shadow-lg sm:text-2xl md:text-3xl">
            {t("home.heroTitle")}
          </p>
        </div>
      </section>

      {/* ショーケースセクション: スマホ縦積み / PC左右分割 */}
      <section className="grid grid-cols-1 grid-rows-[auto_auto] md:grid-cols-2 md:grid-rows-1 md:aspect-[3/1]">
        {/* 左: ダーク背景 + テキスト + CTA */}
        <div className="flex items-center bg-neutral-900 px-6 py-10 md:px-12 lg:px-20">
          <div className="mx-auto max-w-md md:mx-0">
            <h2 className="text-xl font-light tracking-wide text-white sm:text-2xl md:text-3xl">
              {t("home.showcaseTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              {t("home.showcaseDescription")}
            </p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3 text-sm font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-black"
              >
                {t("home.shopNow")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 右: ライフスタイル画像（スマホはテキストと同じ高さ、PCは左に連動） */}
        <div className="relative h-56 overflow-hidden sm:h-64 md:h-auto">
          <Image
            src="/images/showcase/lifestyle-windowsill.jpeg"
            alt="Anime figure on a Scandinavian windowsill"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </section>

      {/* 注目商品セクション */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:px-8">
        <div className="mb-12 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t("home.featuredTitle")}</h2>
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

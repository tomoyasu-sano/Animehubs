import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { generatePageMetadata } from "@/lib/seo";
import { INSTAGRAM_URL } from "@/lib/constants";
import type { Metadata } from "next";

const CONTACT_EMAIL = "anytimes.sano@gmail.com";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return generatePageMetadata({
    title: t("aboutTitle"),
    description: t("aboutDescription"),
    locale,
    path: "/about",
  });
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="-mt-16">
      {/* ヒーロー — ダーク、ヘッダーと同トーン（ヘッダーの裏に潜り込む） */}
      <section className="relative flex min-h-[45vh] items-center justify-center overflow-hidden bg-neutral-900 pt-16 sm:min-h-[55vh]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06)_0%,_transparent_50%)]" />
        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
            {t("heroLabel")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            {t("heroTitle")}
          </h1>
          <div className="mx-auto mt-6 h-px w-12 bg-neutral-700" />
          <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-neutral-400 sm:text-base">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* ストーリー — 白背景 */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
          <Link
            href="/"
            className="mb-12 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground sm:mb-16"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToHome")}
          </Link>

          <h2 className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-muted sm:mb-8">
            {t("storyTitle")}
          </h2>
          <div className="space-y-6">
            <p className="text-base leading-relaxed text-neutral-600 sm:text-lg">
              {t("storyParagraph1")}
            </p>
            <p className="text-base leading-relaxed text-neutral-600 sm:text-lg">
              {t("storyParagraph2")}
            </p>
            <blockquote className="border-l-2 border-neutral-900 pl-5 sm:pl-6">
              <p className="text-base italic leading-relaxed text-foreground sm:text-lg">
                {t("storyParagraph3")}
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* こだわり — 薄グレー背景、番号ベース */}
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
          <h2 className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {t("commitmentsTitle")}
          </h2>
          <p className="mx-auto mb-16 max-w-md text-center text-sm text-muted">
            {t("commitmentsSubtitle")}
          </p>

          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            {/* 01 */}
            <div>
              <p className="mb-4 text-4xl font-extralight tabular-nums text-neutral-300">
                01
              </p>
              <h3 className="mb-3 text-base font-semibold text-foreground">
                {t("commitment1Title")}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {t("commitment1Description")}
              </p>
            </div>

            {/* 02 */}
            <div>
              <p className="mb-4 text-4xl font-extralight tabular-nums text-neutral-300">
                02
              </p>
              <h3 className="mb-3 text-base font-semibold text-foreground">
                {t("commitment2Title")}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {t("commitment2Description")}
              </p>
            </div>

            {/* 03 */}
            <div>
              <p className="mb-4 text-4xl font-extralight tabular-nums text-neutral-300">
                03
              </p>
              <h3 className="mb-3 text-base font-semibold text-foreground">
                {t("commitment3Title")}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {t("commitment3Description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 拠点情報 — 白背景 */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
          <h2 className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {t("locationTitle")}
          </h2>
          <p className="text-lg leading-relaxed text-neutral-600">
            {t("locationDescription")}
          </p>
        </div>
      </section>

      {/* 事業者情報 — 薄グレー背景 */}
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
          <h2 className="mb-12 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {t("businessInfoTitle")}
          </h2>
          <dl className="space-y-6 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
                {t("businessName")}
              </dt>
              <dd className="text-base text-foreground">AnimeHubs</dd>
            </div>
            <div className="h-px bg-neutral-200" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
                {t("businessRepresentative")}
              </dt>
              <dd className="text-base text-foreground">Tomoyasu Sano</dd>
            </div>
            <div className="h-px bg-neutral-200" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
                {t("businessLocation")}
              </dt>
              <dd className="text-base text-foreground">Uppsala, Sweden</dd>
            </div>
            <div className="h-px bg-neutral-200" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
                {t("businessContact")}
              </dt>
              <dd>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  Instagram
                </a>
              </dd>
            </div>
            <div className="h-px bg-neutral-200" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
                {t("businessEmail")}
              </dt>
              <dd>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-base text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  {CONTACT_EMAIL}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* CTA — ダーク、フッターと同トーン */}
      <section className="bg-neutral-900">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-24">
          <h2 className="mb-4 text-2xl font-bold text-white">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mb-10 max-w-md text-sm leading-relaxed text-neutral-400">
            {t("ctaDescription")}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              {t("ctaButton")}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center rounded-full border border-neutral-700 px-8 py-3 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

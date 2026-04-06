import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-v2";
import { getUserFavorites } from "@/lib/db/favorite-queries";
import FavoriteList from "@/components/favorites/FavoriteList";
import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

interface FavoritesPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: FavoritesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "favorites" });

  return generatePageMetadata({
    title: t("title"),
    description: t("title"),
    locale,
    path: "/favorites",
  });
}

export default async function FavoritesPage({ params }: FavoritesPageProps) {
  const { locale } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/favorites`);
  }

  const favorites = await getUserFavorites(session.user.id);
  const t = await getTranslations("favorites");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24 lg:px-8">
      <h1 className="mb-12 text-2xl font-bold text-foreground">{t("title")}</h1>
      <FavoriteList initialFavorites={favorites} />
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";

interface CartLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: CartLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return generatePageMetadata({
    title: t("cartTitle"),
    description: t("cartDescription"),
    locale,
    path: "/cart",
    noIndex: true,
  });
}

export default function CartLayout({ children }: CartLayoutProps) {
  return <>{children}</>;
}

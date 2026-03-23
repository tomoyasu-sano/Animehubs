import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";

interface CheckoutLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: CheckoutLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return generatePageMetadata({
    title: t("checkoutTitle"),
    description: t("checkoutDescription"),
    locale,
    path: "/checkout",
    noIndex: true,
  });
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  return <>{children}</>;
}

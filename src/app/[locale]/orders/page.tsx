import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-v2";
import { getOrdersByUserId } from "@/lib/db/order-queries";
import OrderList from "@/components/orders/OrderList";
import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

interface OrdersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: OrdersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orders" });

  return generatePageMetadata({
    title: t("title"),
    description: t("title"),
    locale,
    path: "/orders",
  });
}

export default async function OrdersPage({ params, searchParams }: OrdersPageProps) {
  const { locale } = await params;
  const { page } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/orders`);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const data = await getOrdersByUserId(session.user.id, { page: pageNum, limit: 10 });

  const t = await getTranslations("orders");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24 lg:px-8">
      <h1 className="mb-10 text-2xl font-bold text-foreground">{t("title")}</h1>
      <OrderList initialData={data} />
    </div>
  );
}

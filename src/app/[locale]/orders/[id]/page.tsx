import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth-v2";
import { getOrderById } from "@/lib/db/order-queries";
import OrderDetail from "@/components/orders/OrderDetail";

interface OrderDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id, locale } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/orders/${id}`);
  }

  const order = await getOrderById(id);
  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  return <OrderDetail initialOrder={order} />;
}

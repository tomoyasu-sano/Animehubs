"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Package, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/lib/db/schema";

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("orderDetail");
  const config: Record<string, { color: string; key: string }> = {
    reserved: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", key: "statusReserved" },
    pending_payment: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", key: "statusPendingPayment" },
    paid: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", key: "statusPaid" },
    shipped: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", key: "statusShipped" },
    completed: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", key: "statusCompleted" },
    cancelled: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", key: "statusCancelled" },
    payment_failed: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", key: "statusPaymentFailed" },
  };
  const c = config[status] || { color: "bg-gray-100 text-gray-800", key: "" };
  const label = c.key ? t(c.key as Parameters<typeof t>[0]) : status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.color}`}>
      {label}
    </span>
  );
}

export default function OrdersPage() {
  const t = useTranslations("orders");
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?page=${p}&limit=10`);
      if (res.ok) {
        const json = (await res.json()) as OrdersResponse;
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(page);
  }, [page, fetchOrders]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t("title")}</h1>

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      )}

      {!loading && data && data.orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-16 w-16 text-muted" />
          <p className="mt-4 text-lg font-medium text-foreground">
            {t("empty")}
          </p>
          <Link
            href="/products"
            className="mt-4 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent"
          >
            {t("browseProducts")}
          </Link>
        </div>
      )}

      {data && data.orders.length > 0 && (
        <>
          <div className="space-y-4">
            {data.orders.map((order) => {
              const items = JSON.parse(order.items) as { name_en: string; quantity: number; price: number }[];
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm font-bold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(order.createdAt).toLocaleDateString("en-SE")}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-3 text-sm text-muted">
                    {items.slice(0, 3).map((item, i) => (
                      <span key={i}>
                        {item.name_en} x{item.quantity}
                        {i < Math.min(items.length, 3) - 1 ? ", " : ""}
                      </span>
                    ))}
                    {items.length > 3 && (
                      <span> +{items.length - 3} more</span>
                    )}
                  </div>
                  <div className="mt-2 text-right text-sm font-semibold text-foreground">
                    {formatPrice(order.totalAmount)}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md p-2 text-muted transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md p-2 text-muted transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

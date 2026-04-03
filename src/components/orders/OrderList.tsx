"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Package, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import type { Order } from "@/lib/db/schema";

interface OrdersData {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

interface OrderListProps {
  initialData: OrdersData;
}

export default function OrderList({ initialData }: OrderListProps) {
  const t = useTranslations("orders");
  const [data, setData] = useState<OrdersData>(initialData);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialData.page);

  const totalPages = Math.ceil(data.total / data.limit);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?page=${p}&limit=10`);
      if (res.ok) {
        const json = (await res.json()) as OrdersData;
        setData(json);
        setPage(p);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  if (data.orders.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        )}
        {!loading &&
          data.orders.map((order) => {
            const items = JSON.parse(order.items) as {
              name_en: string;
              quantity: number;
              price: number;
            }[];
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

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => fetchPage(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="rounded-md p-2 text-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-md p-2 text-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}

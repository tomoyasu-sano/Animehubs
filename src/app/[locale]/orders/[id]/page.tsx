"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
  CreditCard,
  Copy,
  Check,
  XCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { INSTAGRAM_URL } from "@/lib/constants";
import type { OrderItem } from "@/lib/db/schema";

interface OrderData {
  id: string;
  orderNumber: string;
  type: "delivery" | "inspection";
  status: string;
  totalAmount: number;
  items: string;
  shippingAddress: string | null;
  customerName: string;
  customerEmail: string;
  expiresAt: string | null;
  createdAt: string;
  stripeCheckoutSessionId: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("orderDetail");
  const config: Record<string, { color: string; label: string }> = {
    reserved: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: t("statusReserved") },
    pending_payment: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", label: t("statusPendingPayment") },
    paid: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: t("statusPaid") },
    shipped: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", label: t("statusShipped") },
    completed: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: t("statusCompleted") },
    cancelled: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: t("statusCancelled") },
    payment_failed: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: t("statusPaymentFailed") },
  };
  const c = config[status] || { color: "bg-gray-100 text-gray-800", label: status };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

export default function OrderDetailPage() {
  const t = useTranslations("orderDetail");
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const paymentSuccess = searchParams.get("payment") === "success";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        setOrder(null);
        return;
      }
      const data = (await res.json()) as OrderData;
      setOrder(data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // payment=success の場合、paid になるまでポーリング
  useEffect(() => {
    if (!paymentSuccess || !order) return;
    if (order.status !== "reserved") return;

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 10;

    async function poll() {
      if (cancelled || pollCount >= maxPolls) return;
      pollCount++;
      await new Promise((r) => setTimeout(r, 3000));
      if (cancelled) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = (await res.json()) as OrderData;
          setOrder(data);
          if (data.status === "reserved" && pollCount < maxPolls) {
            poll();
          }
        }
      } catch {
        // ignore
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [paymentSuccess, order?.status, orderId]);

  const isExpired = order?.expiresAt
    ? new Date(order.expiresAt) < new Date()
    : false;
  const canPayNow =
    order?.status === "reserved" &&
    order?.type === "inspection" &&
    !isExpired;

  async function handlePayNow() {
    if (!order) return;
    setPayLoading(true);
    setPayError(null);

    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = (await res.json()) as {
        error?: string;
        sessionUrl?: string;
      };

      if (!res.ok) {
        setPayError(data.error || t("payError"));
        return;
      }

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch {
      setPayError(t("payError"));
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-16">
        <Loader2 className="h-12 w-12 animate-spin text-muted" />
        <p className="mt-4 text-lg font-medium text-foreground">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-16">
        <AlertCircle className="h-12 w-12 text-muted" />
        <p className="mt-4 text-lg font-medium text-foreground">
          {t("notFound")}
        </p>
        <Link
          href="/"
          className="mt-4 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent"
        >
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  const items: OrderItem[] = JSON.parse(order.items);
  const deadlineDate = order.expiresAt
    ? new Date(order.expiresAt).toLocaleDateString("en-SE")
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        {order.status === "paid" || order.status === "completed" ? (
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        ) : order.status === "cancelled" || order.status === "payment_failed" ? (
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
        ) : (
          <Clock className="mx-auto h-16 w-16 text-blue-500" />
        )}
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {t("title")}
        </h1>
        <div className="mt-2">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* 注文番号 */}
      <div className="mb-6 rounded-lg bg-card p-4 text-center border border-border">
        <p className="text-sm text-muted">{t("orderNumber")}</p>
        <p className="mt-1 text-xl font-bold font-mono text-foreground">
          {order.orderNumber}
        </p>
      </div>

      {/* payment=success 後のポーリング中 */}
      {paymentSuccess && order.status === "reserved" && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {t("paymentProcessing")}
          </p>
        </div>
      )}

      {/* Pay Now セクション（reserved 注文のみ） */}
      {canPayNow && !paymentSuccess && (
        <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                {t("payNowTitle")}
              </h3>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                {t("payNowDescription")}
              </p>
              {deadlineDate && (
                <p className="mt-1 text-sm font-medium text-blue-900 dark:text-blue-200">
                  {t("deadline", { date: deadlineDate })}
                </p>
              )}
              {payError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {payError}
                </p>
              )}
              <button
                type="button"
                onClick={handlePayNow}
                disabled={payLoading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {payLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {payLoading ? t("processing") : t("payNow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 期限切れ表示 */}
      {order.status === "reserved" && isExpired && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {t("expired")}
          </p>
        </div>
      )}

      {/* Inspection: Instagram DM セクション */}
      {order.type === "inspection" && order.status === "reserved" && !isExpired && (() => {
        const dmText = t("dmTemplate", { orderNumber: order.orderNumber }) +
          (deadlineDate ? `\nDeadline: ${deadlineDate}` : "") +
          "\nMeeting: Uppsala Central Station area";

        return (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              {t("arrangeInspection")}
            </h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {t("arrangeInspectionNote")}
            </p>

            <div className="relative mt-3 rounded-md border border-amber-200 bg-white p-3 dark:border-amber-600 dark:bg-amber-900/50">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(dmText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-800"
              >
                {copied ? (
                  <><Check className="h-3 w-3" />{t("copied")}</>
                ) : (
                  <><Copy className="h-3 w-3" />{t("copyMessage")}</>
                )}
              </button>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1 pr-20">
                {t("copyDmLabel")}
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-line">
                {dmText}
              </p>
            </div>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent"
            >
              {t("contactInstagram")}
            </a>
          </div>
        );
      })()}

      {/* 注文詳細 */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("orderDetails")}
        </h3>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted">
                {item.name_en} x{item.quantity}
              </span>
              <span className="text-foreground">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {t("total")}
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/products"
          className="rounded-lg bg-foreground px-6 py-3 text-center text-sm font-semibold text-background transition-colors hover:bg-accent"
        >
          {t("continueShopping")}
        </Link>
      </div>
    </div>
  );
}

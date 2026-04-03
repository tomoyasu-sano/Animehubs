"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { INSTAGRAM_URL } from "@/lib/constants";
import { useCart } from "@/hooks/useCart";
import type { OrderItem, SwedishAddress } from "@/lib/db/schema";

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
}

type PageState = "loading" | "processing" | "complete" | "not_found";

export default function CheckoutCompletePage() {
  const t = useTranslations("orderComplete");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();

  const [state, setState] = useState<PageState>("loading");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [cartCleared, setCartCleared] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrder = useCallback(async (): Promise<OrderData | null> => {
    if (!sessionId) return null;
    try {
      const res = await fetch(
        `/api/orders/by-session?session_id=${encodeURIComponent(sessionId)}`,
      );
      if (!res.ok) return null;
      return (await res.json()) as OrderData;
    } catch {
      return null;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setState("not_found");
      return;
    }

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 10; // 3秒 x 10 = 最大30秒

    async function poll() {
      const data = await fetchOrder();

      if (cancelled) return;

      if (!data) {
        setState("not_found");
        return;
      }

      if (data.status === "pending_payment") {
        pollCount++;
        if (pollCount >= maxPolls) {
          // タイムアウト: processing のまま表示
          setOrder(data);
          setState("processing");
          return;
        }
        setState("processing");
        setTimeout(poll, 3000);
        return;
      }

      setOrder(data);
      setState("complete");
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchOrder]);

  // 注文確定後にカートをクリア（1回だけ）
  useEffect(() => {
    if (state === "complete" && !cartCleared) {
      clearCart();
      setCartCleared(true);
    }
  }, [state, cartCleared, clearCart]);

  if (state === "loading" || state === "processing") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-16">
        <Loader2 className="h-12 w-12 animate-spin text-muted" />
        <p className="mt-4 text-lg font-medium text-foreground">
          {t("processing")}
        </p>
        <p className="mt-1 text-sm text-muted">{t("processingNote")}</p>
      </div>
    );
  }

  if (state === "not_found" || !order) {
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
  const address: SwedishAddress | null = order.shippingAddress
    ? JSON.parse(order.shippingAddress)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 成功ヘッダー */}
      <div className="mb-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>

      {/* 注文番号 */}
      <div className="mb-6 rounded-lg bg-card p-4 text-center border border-border">
        <p className="text-sm text-muted">{t("orderNumber")}</p>
        <p className="mt-1 text-xl font-bold font-mono text-foreground">
          {order.orderNumber}
        </p>
      </div>

      {/* 実物確認の場合: Instagram DM セクション */}
      {order.type === "inspection" && (() => {
        const deadlineDate = order.expiresAt
          ? new Date(order.expiresAt).toLocaleDateString("en-SE")
          : "7 days";
        const dmText = t("inspectionMessage", {
          orderNumber: order.orderNumber,
        }) + `\nDeadline: ${deadlineDate}\nMeeting: Uppsala Central Station area`;

        return (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              {t("inspectionTitle")}
            </h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {t("inspectionNote")}
            </p>
            {order.expiresAt && (
              <p className="mt-1 text-sm font-medium text-amber-900 dark:text-amber-200">
                {t("inspectionDeadline", { date: deadlineDate })}
              </p>
            )}

            {/* DM 定型文 */}
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
                {t("dmTemplate")}
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

      {/* 配送先住所 */}
      {address && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t("shippingAddress")}
          </h3>
          <div className="mt-2 text-sm text-muted">
            <p>{address.full_name}</p>
            <p>{address.street}</p>
            <p>
              {address.postal_code} {address.city}
            </p>
          </div>
        </div>
      )}

      {/* メール通知 */}
      <p className="mb-6 text-center text-sm text-muted">
        {t("emailSent", { email: order.customerEmail })}
      </p>

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

"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import DeliveryForm from "@/components/checkout/DeliveryForm";

export default function DeliveryCheckoutPage() {
  const t = useTranslations("checkout");
  const { isEmpty } = useCart();
  const cancelledRef = useRef(false);

  // ブラウザ戻るで Stripe から戻った場合、pending session をキャンセル
  useEffect(() => {
    if (cancelledRef.current) return;
    const pendingSession = sessionStorage.getItem("pending_checkout_session");
    if (!pendingSession) return;
    cancelledRef.current = true;
    sessionStorage.removeItem("pending_checkout_session");

    fetch("/api/checkout/cancel-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: pendingSession }),
    }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 戻るリンク */}
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToCart")}
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-foreground">
        {t("deliveryTitle")}
      </h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <ShoppingCart className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg text-muted">{t("emptyCart")}</p>
          <Link
            href="/products"
            className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent"
          >
            {t("browseProducts")}
          </Link>
        </div>
      ) : (
        <DeliveryForm />
      )}
    </div>
  );
}

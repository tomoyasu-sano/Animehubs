"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils";
import {
  FREE_SHIPPING_THRESHOLD_ORE,
  SHIPPING_FEE_ORE,
} from "@/lib/constants";
import OrderTypeSelector from "@/components/checkout/OrderTypeSelector";
import type { OrderType } from "@/lib/db/schema";

interface CartSummaryProps {
  totalAmount: number;
  totalItems: number;
  showCheckoutButton?: boolean;
}

export default function CartSummary({
  totalAmount,
  totalItems,
  showCheckoutButton = true,
}: CartSummaryProps) {
  const t = useTranslations("cart");
  const tc = useTranslations("checkout");
  const [orderType, setOrderType] = useState<OrderType | null>(null);

  const needsShipping =
    orderType === "delivery" && totalAmount < FREE_SHIPPING_THRESHOLD_ORE;
  const shippingFee = needsShipping ? SHIPPING_FEE_ORE : 0;
  const grandTotal = totalAmount + shippingFee;

  const checkoutHref =
    orderType === "delivery"
      ? "/checkout/delivery"
      : orderType === "inspection"
        ? "/checkout/inspection"
        : null;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">{t("summary")}</h3>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {t("itemCount", { count: totalItems })}
          </span>
          <span className="text-foreground">{formatPrice(totalAmount)}</span>
        </div>
        {orderType === "delivery" && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{tc("shipping")}</span>
            <span className="text-foreground">
              {shippingFee === 0 ? tc("shippingFree") : formatPrice(shippingFee)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground">
            {t("total")}
          </span>
          <span className="text-lg font-bold text-foreground">
            {formatPrice(grandTotal)}
          </span>
        </div>
        {needsShipping && (
          <p className="mt-1 text-xs text-muted">{tc("freeShippingNote")}</p>
        )}
      </div>

      {showCheckoutButton && (
        <div className="mt-6 space-y-4">
          <OrderTypeSelector selected={orderType} onSelect={setOrderType} />
          {checkoutHref ? (
            <Link
              href={checkoutHref}
              className="block w-full rounded-lg bg-foreground py-3 text-center text-sm font-semibold text-background transition-colors hover:bg-accent"
            >
              {orderType === "delivery"
                ? tc("proceedToDelivery")
                : tc("proceedToInspection")}
            </Link>
          ) : (
            <button
              disabled
              className="block w-full cursor-not-allowed rounded-lg bg-foreground/50 py-3 text-center text-sm font-semibold text-background"
            >
              {t("checkout")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

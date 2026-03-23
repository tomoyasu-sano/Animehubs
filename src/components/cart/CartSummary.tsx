"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils";

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
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground">{t("total")}</span>
          <span className="text-lg font-bold text-foreground">
            {formatPrice(totalAmount)}
          </span>
        </div>
      </div>

      {showCheckoutButton && (
        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-lg bg-foreground py-3 text-center text-sm font-semibold text-background transition-colors hover:bg-accent"
        >
          {t("checkout")}
        </Link>
      )}
    </div>
  );
}

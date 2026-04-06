"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import InspectionForm from "@/components/checkout/InspectionForm";

export default function InspectionCheckoutPage() {
  const t = useTranslations("checkout");
  const { isEmpty } = useCart();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24 lg:px-8">
      {/* 戻るリンク */}
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToCart")}
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-foreground">
        {t("inspectionTitle")}
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
        <InspectionForm />
      )}
    </div>
  );
}

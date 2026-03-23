"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import CartItemComponent from "@/components/cart/CartItem";
import CartSummary from "@/components/cart/CartSummary";

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { items, updateQuantity, removeItem, totalAmount, totalItems, isEmpty } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 戻るリンク */}
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("continueShopping")}
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-foreground">{t("title")}</h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <ShoppingCart className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg text-muted">{t("empty")}</p>
          <Link
            href="/products"
            className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent"
          >
            {t("continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* カートアイテム */}
          <div className="lg:col-span-2">
            {items.map((item) => (
              <CartItemComponent
                key={item.productId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* サマリー */}
          <div>
            <CartSummary
              totalAmount={totalAmount}
              totalItems={totalItems}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useState, useCallback } from "react";
import type { Product } from "@/lib/db/schema";

interface AddToCartButtonProps {
  product: Product;
  onCartOpen?: () => void;
}

export default function AddToCartButton({ product, onCartOpen }: AddToCartButtonProps) {
  const t = useTranslations("products");
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const cartItem = items.find((item) => item.productId === product.id);
  const isAtStockLimit = cartItem ? cartItem.quantity >= product.stock : false;

  const handleAdd = useCallback(() => {
    if (product.stock === 0 || isAtStockLimit) return;
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    onCartOpen?.();
  }, [product, addItem, isAtStockLimit, onCartOpen]);

  if (product.stock === 0) {
    return (
      <button
        disabled
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background opacity-50 cursor-not-allowed"
      >
        {t("outOfStock")}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isAtStockLimit}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {justAdded ? (
        <>
          <Check className="h-4 w-4" />
          {t("addedToCart")}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {isAtStockLimit ? t("stockLimit") : t("addToCart")}
        </>
      )}
    </button>
  );
}

"use client";

import { useTranslations, useLocale } from "next-intl";
import { ShoppingCart, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { useState, useCallback } from "react";
import type { Product } from "@/lib/db/schema";

interface AddToCartButtonProps {
  product: Product;
  onCartOpen?: () => void;
}

export default function AddToCartButton({ product, onCartOpen }: AddToCartButtonProps) {
  const t = useTranslations("products");
  const locale = useLocale();
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const availableStock = product.stock - product.reservedStock;
  const cartItem = items.find((item) => item.productId === product.id);
  const isAtStockLimit = cartItem ? cartItem.quantity >= availableStock : false;

  const handleAdd = useCallback(() => {
    // 未ログイン時はログインページへリダイレクト
    if (status !== "authenticated") {
      router.push(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (availableStock <= 0 || isAtStockLimit) return;
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
    onCartOpen?.();
  }, [product, addItem, isAtStockLimit, onCartOpen, status, locale, pathname, router, availableStock]);

  if (availableStock <= 0) {
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
      disabled={isAtStockLimit || justAdded}
      className={`cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
        justAdded
          ? "bg-green-600 text-white scale-105"
          : "bg-foreground text-background hover:scale-[1.02] hover:bg-accent"
      }`}
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

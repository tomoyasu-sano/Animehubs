"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import CartSidebar from "@/components/cart/CartSidebar";

export default function CartButton() {
  const t = useTranslations("common");
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button
        onClick={() => setCartOpen(true)}
        className="relative rounded-md p-2 text-muted transition-colors hover:text-white"
        aria-label={t("cart")}
      >
        <ShoppingCart className="h-5 w-5" />
        {mounted && totalItems > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </button>
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

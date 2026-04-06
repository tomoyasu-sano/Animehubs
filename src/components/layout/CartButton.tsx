"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import CartSidebar from "@/components/cart/CartSidebar";
import { cn } from "@/lib/utils";

export default function CartButton({ darkMode = false }: { darkMode?: boolean }) {
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
        className={cn(
          "cursor-pointer relative rounded-md p-2 transition-all hover:scale-110",
          darkMode ? "text-black/70 hover:text-black" : "text-white/70 hover:text-white"
        )}
        aria-label={t("cart")}
      >
        <ShoppingCart className="h-5 w-5" />
        {mounted && totalItems > 0 && (
          <span className={cn(
            "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
            darkMode ? "bg-black text-white" : "bg-white text-black"
          )}>
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </button>
      {mounted &&
        createPortal(
          <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />,
          document.body
        )}
    </>
  );
}

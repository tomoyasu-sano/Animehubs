"use client";

import { useTranslations } from "next-intl";
import { X, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import CartItemComponent from "./CartItem";
import { useEffect, useState } from "react";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const t = useTranslations("cart");
  const [mounted, setMounted] = useState(false);
  const cart = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  // hydration中はサーバーと同じ空状態を返す（DOM一致を保証）
  const items = mounted ? cart.items : [];
  const totalItems = mounted ? cart.totalItems : 0;
  const totalAmount = mounted ? cart.totalAmount : 0;
  const isEmpty = mounted ? cart.isEmpty : true;
  const { updateQuantity, removeItem } = cart;

  // スクロールロック（モバイルでフルスクリーン時のスクロール防止）
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* サイドパネル - モバイルではフルスクリーン */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-xl transition-transform duration-300 ease-in-out sm:max-w-md ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            {totalItems > 0 && (
              <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-muted transition-all hover:scale-110 hover:text-foreground"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* カート内容 */}
        <div className="flex-1 overflow-y-auto px-4">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted">{t("empty")}</p>
              <button
                onClick={onClose}
                className="cursor-pointer mt-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:scale-[1.02] hover:bg-accent"
              >
                {t("continueShopping")}
              </button>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartItemComponent
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        {!isEmpty && (
          <div className="border-t border-border p-4 pb-safe">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">{t("total")}</span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <Link
              href="/cart"
              onClick={onClose}
              className="cursor-pointer block w-full rounded-lg bg-foreground py-3 text-center text-sm font-semibold text-background transition-all hover:scale-[1.02] hover:bg-accent"
            >
              {t("checkout")}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

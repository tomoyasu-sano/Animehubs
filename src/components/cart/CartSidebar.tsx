"use client";

import { useTranslations, useLocale } from "next-intl";
import { X, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import CartItemComponent from "./CartItem";
import { useEffect } from "react";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { items, updateQuantity, removeItem, totalAmount, totalItems, isEmpty } = useCart();

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
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-background shadow-xl transition-transform duration-300 ease-in-out sm:max-w-md ${
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
            className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
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
                className="mt-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent"
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
            <div className="flex flex-col gap-2">
              <Link
                href="/checkout"
                onClick={onClose}
                className="block w-full rounded-lg bg-foreground py-3 text-center text-sm font-semibold text-background transition-colors hover:bg-accent"
              >
                {t("checkout")}
              </Link>
              <Link
                href="/cart"
                onClick={onClose}
                className="block w-full rounded-lg border border-border py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-card"
              >
                {t("viewCart")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

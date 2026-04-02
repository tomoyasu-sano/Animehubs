"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CartItem as CartItemType } from "@/hooks/useCart";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const locale = useLocale();
  const t = useTranslations("cart");
  const name = locale === "sv" ? item.nameSv : item.nameEn;

  return (
    <div className="flex gap-4 border-b border-border py-4">
      {/* 商品画像 */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-border bg-card">
        <Image
          src={item.image}
          alt={name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      {/* 商品情報 */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground line-clamp-1">{name}</h3>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {formatPrice(item.price)}
          </p>
        </div>

        {/* 数量操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted transition-colors hover:border-foreground hover:text-foreground"
              aria-label={t("decrease")}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-medium text-foreground">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.stock - item.reservedStock}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("increase")}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => onRemove(item.productId)}
            className="text-muted transition-colors hover:text-destructive"
            aria-label={t("remove")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

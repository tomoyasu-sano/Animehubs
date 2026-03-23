"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatPrice, getLocalizedField } from "@/lib/utils";
import { CONDITION_LABELS, type Condition } from "@/lib/constants";
import FavoriteButton from "@/components/favorites/FavoriteButton";
import type { Product } from "@/lib/db/schema";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
}

export default function ProductCard({ product, isFavorite, onToggleFavorite }: ProductCardProps) {
  const locale = useLocale();
  const t = useTranslations("products");
  const name = getLocalizedField(product, "name", locale);
  const images: string[] = JSON.parse(product.images);
  const firstImage = images[0] || "/placeholder/no-image.svg";
  const conditionLabel =
    CONDITION_LABELS[product.condition as Condition]?.[locale as "en" | "sv"] || product.condition;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card transition-colors group-hover:bg-card-hover">
        {/* 商品画像 */}
        <Image
          src={firstImage}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* お気に入りボタン */}
        <div className="absolute right-3 top-3">
          <FavoriteButton
            productId={product.id}
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
          />
        </div>

        {/* 在庫切れオーバーレイ */}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-md bg-black px-3 py-1 text-sm font-medium text-white">
              {t("outOfStock")}
            </span>
          </div>
        )}
      </div>

      {/* 商品情報 */}
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 transition-colors group-hover:text-muted">
          {name}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-foreground">{formatPrice(product.price)}</p>
          <span className="text-xs text-muted">{conditionLabel}</span>
        </div>
      </div>
    </Link>
  );
}

"use client";

import ProductCard from "./ProductCard";
import { useFavorites } from "@/hooks/useFavorites";
import { useTranslations } from "next-intl";
import type { Product } from "@/lib/db/schema";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const t = useTranslations("products");
  const { isFavorite, toggleFavorite, getLikesDelta } = useFavorites();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-muted">{t("noResults")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("tryDifferent")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={isFavorite(product.id)}
          onToggleFavorite={toggleFavorite}
          likesDelta={getLikesDelta(product.id)}
        />
      ))}
    </div>
  );
}

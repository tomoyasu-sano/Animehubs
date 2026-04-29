"use client";

import ProductCard from "./ProductCard";
import { useFavorites } from "@/hooks/useFavorites";
import type { Product } from "@/lib/db/schema";

interface RecommendedProductsGridProps {
  products: Product[];
}

export default function RecommendedProductsGrid({ products }: RecommendedProductsGridProps) {
  const { isFavorite, toggleFavorite, getLikesDelta } = useFavorites();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
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

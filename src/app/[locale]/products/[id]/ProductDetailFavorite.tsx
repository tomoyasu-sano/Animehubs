"use client";

import FavoriteButton from "@/components/favorites/FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";

interface ProductDetailFavoriteProps {
  productId: string;
}

export default function ProductDetailFavorite({ productId }: ProductDetailFavoriteProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <FavoriteButton
      productId={productId}
      isFavorite={isFavorite(productId)}
      onToggle={toggleFavorite}
      className="!rounded-lg !p-3"
    />
  );
}

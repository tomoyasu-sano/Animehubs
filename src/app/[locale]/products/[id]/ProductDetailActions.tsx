"use client";

import { useFavorites } from "@/hooks/useFavorites";
import FavoriteButton from "@/components/favorites/FavoriteButton";
import AddToCartButton from "@/components/cart/AddToCartButton";
import type { Product } from "@/lib/db/schema";

interface ProductDetailActionsProps {
  product: Product;
}

export default function ProductDetailActions({ product }: ProductDetailActionsProps) {
  const { isFavorite, toggleFavorite, getLikesDelta } = useFavorites();

  return (
    <div className="flex gap-3 border-t border-border pt-6">
      <AddToCartButton product={product} />
      <FavoriteButton
        productId={product.id}
        isFavorite={isFavorite(product.id)}
        onToggle={toggleFavorite}
        likesCount={Math.max(0, product.likesCount + getLikesDelta(product.id))}
        className="!rounded-lg !p-3"
      />
    </div>
  );
}

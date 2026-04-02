"use client";

import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Heart, ShoppingCart, Check } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import type { FavoriteWithProduct } from "@/lib/db/favorite-queries";
import { useState, useEffect, useCallback } from "react";

export default function FavoritesPage() {
  const t = useTranslations("favorites");
  const locale = useLocale();
  const { toggleFavorite } = useFavorites();
  const { addItem, items: cartItems } = useCart();
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const res = await fetch("/api/favorites");
        if (res.ok) {
          const data: FavoriteWithProduct[] = await res.json();
          setFavorites(data);
        }
      } catch {
        // エラー時は空のまま
      } finally {
        setIsLoading(false);
      }
    }
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = (productId: string) => {
    toggleFavorite(productId);
    setFavorites((prev) => prev.filter((f) => f.productId !== productId));
  };

  const handleAddToCart = useCallback((fav: FavoriteWithProduct) => {
    const product = fav.product;
    const availableStock = product.stock - product.reservedStock;
    const cartItem = cartItems.find((ci) => ci.productId === product.id);
    const currentQty = cartItem ? cartItem.quantity : 0;
    if (availableStock <= 0 || currentQty >= availableStock) return;

    addItem({
      id: product.id,
      nameEn: product.nameEn,
      nameSv: product.nameSv,
      price: product.price,
      stock: product.stock,
      reservedStock: product.reservedStock,
      images: product.images,
    } as Parameters<typeof addItem>[0]);

    setJustAddedIds((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setJustAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2500);
  }, [addItem, cartItems]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-foreground">{t("title")}</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4">
              <div className="aspect-square rounded-md bg-muted" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-4 w-1/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-foreground">{t("title")}</h1>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Heart className="mb-4 h-12 w-12 text-muted" />
          <p className="text-lg font-medium text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => {
            const product = fav.product;
            const name = locale === "sv" ? product.nameSv : product.nameEn;
            let images: string[] = [];
            try {
              const parsed: unknown = JSON.parse(product.images);
              if (Array.isArray(parsed)) {
                images = parsed.filter((v): v is string => typeof v === "string");
              }
            } catch {
              // 不正なJSON — フォールバック
            }
            const firstImage = images[0] || "/placeholder/no-image.svg";
            const availableStock = product.stock - product.reservedStock;
            const isOutOfStock = availableStock <= 0;
            const cartItem = cartItems.find((ci) => ci.productId === product.id);
            const isAtStockLimit = cartItem ? cartItem.quantity >= availableStock : false;
            const justAdded = justAddedIds.has(product.id);

            return (
              <div
                key={fav.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card"
              >
                <Link href={`/products/${fav.productId}`}>
                  <div className="relative aspect-square">
                    <Image
                      src={firstImage}
                      alt={name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="rounded-md bg-black px-3 py-1 text-sm font-medium text-white">
                          {t("outOfStock")}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/products/${fav.productId}`}>
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-muted">
                      {name}
                    </h3>
                  </Link>
                  <p className="mt-1 text-base font-semibold text-foreground">
                    {formatPrice(product.price)}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleAddToCart(fav)}
                      disabled={isOutOfStock || isAtStockLimit || justAdded}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                        justAdded
                          ? "bg-green-600 text-white scale-105"
                          : "bg-foreground text-background hover:bg-accent"
                      }`}
                    >
                      {justAdded ? (
                        <>
                          <Check className="h-4 w-4" />
                          {t("addedToCart")}
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          {isAtStockLimit ? t("stockLimit") : t("addToCart")}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(fav.productId)}
                      className="rounded-lg p-2.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                      aria-label={t("remove")}
                    >
                      <Heart className="h-5 w-5 fill-current" />
                    </button>
                  </div>

                  {!isOutOfStock && availableStock <= 3 && (
                    <p className="mt-2 text-xs text-amber-500">
                      {t("onlyLeft", { count: availableStock })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

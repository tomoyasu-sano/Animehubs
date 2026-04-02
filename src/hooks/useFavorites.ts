"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";

export function useFavorites() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  // likesCount の楽観的更新差分（productId → delta）
  const [likesDeltas, setLikesDeltas] = useState<Record<string, number>>({});

  // 認証済みの場合、APIからお気に入り一覧を取得
  /* eslint-disable react-hooks/set-state-in-effect -- 未認証時リセットはstatus変化起因でカスケード問題なし */
  useEffect(() => {
    if (status !== "authenticated") {
      setFavoriteIds([]);
      setIsLoaded(status === "unauthenticated");
      return;
    }

    let cancelled = false;

    async function fetchFavorites() {
      try {
        const res = await fetch("/api/favorites");
        if (!res.ok) return;
        const data = (await res.json()) as { productId: string }[];
        if (!cancelled) {
          setFavoriteIds(data.map((f) => f.productId));
          setIsLoaded(true);
        }
      } catch {
        if (!cancelled) setIsLoaded(true);
      }
    }

    fetchFavorites();
    return () => {
      cancelled = true;
    };
  }, [status]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (productId: string) => {
      // 未認証の場合はログインページへリダイレクト
      if (status !== "authenticated" || !session?.user) {
        const loginUrl = `/${locale}/auth/login?callbackUrl=${encodeURIComponent(pathname)}`;
        router.push(loginUrl);
        return;
      }

      const isCurrentlyFavorite = favoriteIds.includes(productId);

      // 楽観的更新
      if (isCurrentlyFavorite) {
        setFavoriteIds((prev) => prev.filter((id) => id !== productId));
        setLikesDeltas((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) - 1 }));
      } else {
        setFavoriteIds((prev) => [...prev, productId]);
        setLikesDeltas((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
      }

      // API呼び出し（バックグラウンド）
      const apiCall = isCurrentlyFavorite
        ? fetch(`/api/favorites/${productId}`, { method: "DELETE" })
        : fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });

      const rollback = () => {
        if (isCurrentlyFavorite) {
          setFavoriteIds((prev) => [...prev, productId]);
          setLikesDeltas((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
        } else {
          setFavoriteIds((prev) => prev.filter((id) => id !== productId));
          setLikesDeltas((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) - 1 }));
        }
      };

      apiCall
        .then((res) => {
          if (!res.ok) rollback();
        })
        .catch(() => {
          rollback();
        });
    },
    [status, session, favoriteIds, locale, pathname, router],
  );

  const getLikesDelta = useCallback(
    (productId: string) => likesDeltas[productId] ?? 0,
    [likesDeltas],
  );

  return {
    favorites: favoriteIds,
    isLoaded,
    toggleFavorite,
    isFavorite,
    getLikesDelta,
    count: favoriteIds.length,
  };
}

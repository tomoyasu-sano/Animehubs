"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const FAVORITES_KEY = "animehubs_favorites";

const EMPTY_ARRAY: string[] = [];
let cachedSnapshot: string[] = EMPTY_ARRAY;
let cachedRaw: string | null = null;

function getSnapshot(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = raw ? JSON.parse(raw) : EMPTY_ARRAY;
    }
    return cachedSnapshot;
  } catch {
    return EMPTY_ARRAY;
  }
}

function getServerSnapshot(): string[] {
  return EMPTY_ARRAY;
}

function subscribe(callback: () => void): () => void {
  // storage イベントで他タブの変更も検知
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useFavorites() {
  const externalFavorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localFavorites, setLocalFavorites] = useState<string[] | null>(null);

  // ローカル状態がある場合はそちらを優先（即時反映のため）
  const favorites = localFavorites ?? externalFavorites;

  const saveFavorites = useCallback((newFavorites: string[]) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch {
      // 保存失敗時は無視
    }
    setLocalFavorites(newFavorites);
  }, []);

  const toggleFavorite = useCallback(
    (productId: string) => {
      const current = localFavorites ?? externalFavorites;
      const newFavorites = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      saveFavorites(newFavorites);
    },
    [localFavorites, externalFavorites, saveFavorites]
  );

  const isFavorite = useCallback(
    (productId: string) => {
      return favorites.includes(productId);
    },
    [favorites]
  );

  return {
    favorites,
    isLoaded: true,
    toggleFavorite,
    isFavorite,
    count: favorites.length,
  };
}

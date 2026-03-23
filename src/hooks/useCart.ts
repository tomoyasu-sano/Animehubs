"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import type { Product } from "@/lib/db/schema";

// カートアイテムの型定義
export interface CartItem {
  productId: string;
  nameEn: string;
  nameSv: string;
  price: number; // オーレ単位
  quantity: number;
  image: string;
  stock: number;
}

const CART_KEY = "animehubs_cart";

const EMPTY_ARRAY: CartItem[] = [];
let cachedSnapshot: CartItem[] = EMPTY_ARRAY;
let cachedRaw: string | null = null;

function getSnapshot(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = raw ? JSON.parse(raw) : EMPTY_ARRAY;
    }
    return cachedSnapshot;
  } catch {
    return EMPTY_ARRAY;
  }
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_ARRAY;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useCart() {
  const externalItems = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localItems, setLocalItems] = useState<CartItem[] | null>(null);

  const items = localItems ?? externalItems;

  const saveItems = useCallback((newItems: CartItem[]) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(newItems));
      // キャッシュも更新
      cachedRaw = JSON.stringify(newItems);
      cachedSnapshot = newItems;
    } catch {
      // 保存失敗時は無視
    }
    setLocalItems(newItems);
  }, []);

  const addItem = useCallback(
    (product: Product) => {
      const current = localItems ?? externalItems;
      const existing = current.find((item) => item.productId === product.id);
      const images: string[] = JSON.parse(product.images);

      if (existing) {
        // 在庫上限チェック
        if (existing.quantity >= product.stock) return;
        const updated = current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        saveItems(updated);
      } else {
        if (product.stock <= 0) return;
        const newItem: CartItem = {
          productId: product.id,
          nameEn: product.nameEn,
          nameSv: product.nameSv,
          price: product.price,
          quantity: 1,
          image: images[0] || "/placeholder/no-image.svg",
          stock: product.stock,
        };
        saveItems([...current, newItem]);
      }
    },
    [localItems, externalItems, saveItems]
  );

  const removeItem = useCallback(
    (productId: string) => {
      const current = localItems ?? externalItems;
      saveItems(current.filter((item) => item.productId !== productId));
    },
    [localItems, externalItems, saveItems]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const current = localItems ?? externalItems;
      if (quantity <= 0) {
        saveItems(current.filter((item) => item.productId !== productId));
        return;
      }
      const updated = current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item
      );
      saveItems(updated);
    },
    [localItems, externalItems, saveItems]
  );

  const clearCart = useCallback(() => {
    saveItems([]);
  }, [saveItems]);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount,
    totalItems,
    isEmpty: items.length === 0,
  };
}

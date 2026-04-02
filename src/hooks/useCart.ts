"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
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
  reservedStock: number;
}

const CART_KEY = "animehubs_cart";
const CART_UPDATED_EVENT = "cart-updated";

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
  window.addEventListener(CART_UPDATED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CART_UPDATED_EVENT, callback);
  };
}

/** localStorageに保存し、全useCartインスタンスに通知 */
function saveItems(newItems: CartItem[]) {
  try {
    const json = JSON.stringify(newItems);
    localStorage.setItem(CART_KEY, json);
    cachedRaw = json;
    cachedSnapshot = newItems;
  } catch {
    // 保存失敗時は無視
  }
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

const noOp = () => {};

export function useCart() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback(
    (product: Product) => {
      // getSnapshot() で最新のカート状態を取得
      const current = getSnapshot();
      const existing = current.find((item) => item.productId === product.id);
      const images: string[] = JSON.parse(product.images);
      const availableStock = product.stock - product.reservedStock;

      if (existing) {
        if (existing.quantity >= availableStock) return;
        const updated = current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        saveItems(updated);
      } else {
        if (availableStock <= 0) return;
        const newItem: CartItem = {
          productId: product.id,
          nameEn: product.nameEn,
          nameSv: product.nameSv,
          price: product.price,
          quantity: 1,
          image: images[0] || "/placeholder/no-image.svg",
          stock: product.stock,
          reservedStock: product.reservedStock,
        };
        saveItems([...current, newItem]);
      }
    },
    []
  );

  const removeItem = useCallback(
    (productId: string) => {
      const current = getSnapshot();
      saveItems(current.filter((item) => item.productId !== productId));
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const current = getSnapshot();
      if (quantity <= 0) {
        saveItems(current.filter((item) => item.productId !== productId));
        return;
      }
      const updated = current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.stock - item.reservedStock) }
          : item
      );
      saveItems(updated);
    },
    []
  );

  const clearCart = useCallback(() => {
    saveItems([]);
  }, []);

  // 未認証時は操作を無効化（localStorageは保持）
  if (!isAuthenticated) {
    return {
      items: EMPTY_ARRAY,
      addItem: noOp as unknown as typeof addItem,
      removeItem: noOp as unknown as typeof removeItem,
      updateQuantity: noOp as unknown as typeof updateQuantity,
      clearCart: noOp,
      totalAmount: 0,
      totalItems: 0,
      isEmpty: true,
    };
  }

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

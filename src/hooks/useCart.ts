"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Product } from "@/lib/db/schema";
import { parseImages } from "@/lib/utils";

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

const CART_KEY_PREFIX = "animehubs_cart_";
const LEGACY_CART_KEY = "animehubs_cart";
const CART_UPDATED_EVENT = "cart-updated";

const EMPTY_ARRAY: CartItem[] = [];

/** ユーザーIDに紐づくカートキーを生成 */
function cartKey(userId: string): string {
  return `${CART_KEY_PREFIX}${userId}`;
}

/** localStorageからカートを読み込む */
function readCart(userId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(cartKey(userId));
    return raw ? JSON.parse(raw) : EMPTY_ARRAY;
  } catch {
    return EMPTY_ARRAY;
  }
}

/** localStorageにカートを保存し、他のインスタンスに通知 */
function persistCart(userId: string, newItems: CartItem[]) {
  try {
    localStorage.setItem(cartKey(userId), JSON.stringify(newItems));
  } catch {
    // 保存失敗時は無視
  }
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

/** 旧キー（ユーザー共通）のデータを新キーにマイグレーションし、旧キーを削除 */
function migrateLegacyCart(userId: string) {
  try {
    const legacy = localStorage.getItem(LEGACY_CART_KEY);
    if (!legacy) return;
    const existing = localStorage.getItem(cartKey(userId));
    if (!existing) {
      localStorage.setItem(cartKey(userId), legacy);
    }
    localStorage.removeItem(LEGACY_CART_KEY);
  } catch {
    // マイグレーション失敗時は無視
  }
}

const noOp = () => {};

export function useCart() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const userId = session?.user?.id;
  // 初期値は空配列 → サーバーレンダリングと一致（hydration mismatch を回避）
  const [items, setItems] = useState<CartItem[]>(EMPTY_ARRAY);
  // useCallback 内から最新の items / userId を参照するための ref
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // マウント後に localStorage から読み込み + イベントリスナー登録
  // userId が変わるたびに再実行（ユーザー切り替え対応）
  useEffect(() => {
    if (!userId) return;

    migrateLegacyCart(userId);
    setItems(readCart(userId));

    const handleChange = () => {
      setItems(readCart(userId));
    };

    window.addEventListener("storage", handleChange);
    window.addEventListener(CART_UPDATED_EVENT, handleChange);
    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(CART_UPDATED_EVENT, handleChange);
    };
  }, [userId]);

  const addItem = useCallback(
    (product: Product) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const current = itemsRef.current;
      const existing = current.find((item) => item.productId === product.id);
      const images = parseImages(product.images);
      const availableStock = product.stock - product.reservedStock;

      if (existing) {
        if (existing.quantity >= availableStock) return;
        const updated = current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        persistCart(uid, updated);
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
        persistCart(uid, [...current, newItem]);
      }
    },
    []
  );

  const removeItem = useCallback(
    (productId: string) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const current = itemsRef.current;
      persistCart(uid, current.filter((item) => item.productId !== productId));
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const current = itemsRef.current;
      if (quantity <= 0) {
        persistCart(uid, current.filter((item) => item.productId !== productId));
        return;
      }
      const updated = current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.stock - item.reservedStock) }
          : item
      );
      persistCart(uid, updated);
    },
    []
  );

  const clearCart = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid) return;
    persistCart(uid, []);
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

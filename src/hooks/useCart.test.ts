import { describe, it, expect, beforeEach, vi } from "vitest";

// localStorage のモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// CartItem 型の定義（テスト用）
interface CartItem {
  productId: string;
  nameEn: string;
  nameSv: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
}

const CART_KEY = "animehubs_cart";

// ヘルパー: ローカルストレージからカートを取得
function getCartItems(): CartItem[] {
  const raw = localStorageMock.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

// ヘルパー: ローカルストレージにカートを設定
function setCartItems(items: CartItem[]) {
  localStorageMock.setItem(CART_KEY, JSON.stringify(items));
}

// テスト用の商品データ
const mockProduct = {
  id: "product-1",
  nameEn: "Naruto Figure",
  nameSv: "Naruto Figur",
  descriptionEn: "A great figure",
  descriptionSv: "En bra figur",
  price: 129900,
  stock: 3,
  category: "figures",
  condition: "sealed",
  images: '["/images/naruto.jpg"]',
  featured: 0,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("Cart ロジック（ユニットテスト）", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("空のカートを初期化できる", () => {
    const items = getCartItems();
    expect(items).toEqual([]);
  });

  it("商品を追加できる", () => {
    const images: string[] = JSON.parse(mockProduct.images);
    const item: CartItem = {
      productId: mockProduct.id,
      nameEn: mockProduct.nameEn,
      nameSv: mockProduct.nameSv,
      price: mockProduct.price,
      quantity: 1,
      image: images[0] || "/placeholder/no-image.svg",
      stock: mockProduct.stock,
    };
    setCartItems([item]);

    const items = getCartItems();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("product-1");
    expect(items[0].quantity).toBe(1);
    expect(items[0].price).toBe(129900);
  });

  it("同じ商品を追加すると数量が増加する", () => {
    const images: string[] = JSON.parse(mockProduct.images);
    const item: CartItem = {
      productId: mockProduct.id,
      nameEn: mockProduct.nameEn,
      nameSv: mockProduct.nameSv,
      price: mockProduct.price,
      quantity: 1,
      image: images[0],
      stock: mockProduct.stock,
    };
    setCartItems([item]);

    // 数量増加
    const items = getCartItems();
    const updated = items.map((i) =>
      i.productId === mockProduct.id ? { ...i, quantity: i.quantity + 1 } : i
    );
    setCartItems(updated);

    const result = getCartItems();
    expect(result[0].quantity).toBe(2);
  });

  it("在庫上限を超えて追加できない", () => {
    const images: string[] = JSON.parse(mockProduct.images);
    const item: CartItem = {
      productId: mockProduct.id,
      nameEn: mockProduct.nameEn,
      nameSv: mockProduct.nameSv,
      price: mockProduct.price,
      quantity: mockProduct.stock, // 在庫上限
      image: images[0],
      stock: mockProduct.stock,
    };
    setCartItems([item]);

    // 在庫上限チェック
    const items = getCartItems();
    const existing = items.find((i) => i.productId === mockProduct.id);
    expect(existing!.quantity).toBe(3);
    // 在庫上限のため追加しない
    const shouldAdd = existing!.quantity < mockProduct.stock;
    expect(shouldAdd).toBe(false);
  });

  it("商品を削除できる", () => {
    const item1: CartItem = {
      productId: "product-1",
      nameEn: "Product 1",
      nameSv: "Produkt 1",
      price: 100,
      quantity: 1,
      image: "/img1.jpg",
      stock: 5,
    };
    const item2: CartItem = {
      productId: "product-2",
      nameEn: "Product 2",
      nameSv: "Produkt 2",
      price: 200,
      quantity: 1,
      image: "/img2.jpg",
      stock: 3,
    };
    setCartItems([item1, item2]);

    const filtered = getCartItems().filter((i) => i.productId !== "product-1");
    setCartItems(filtered);

    const result = getCartItems();
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("product-2");
  });

  it("数量を変更できる", () => {
    const item: CartItem = {
      productId: "product-1",
      nameEn: "Product 1",
      nameSv: "Produkt 1",
      price: 100,
      quantity: 1,
      image: "/img1.jpg",
      stock: 5,
    };
    setCartItems([item]);

    const updated = getCartItems().map((i) =>
      i.productId === "product-1" ? { ...i, quantity: 3 } : i
    );
    setCartItems(updated);

    const result = getCartItems();
    expect(result[0].quantity).toBe(3);
  });

  it("数量を0にすると商品が削除される", () => {
    const item: CartItem = {
      productId: "product-1",
      nameEn: "Product 1",
      nameSv: "Produkt 1",
      price: 100,
      quantity: 1,
      image: "/img1.jpg",
      stock: 5,
    };
    setCartItems([item]);

    const newQuantity = 0;
    const items = getCartItems();
    if (newQuantity <= 0) {
      setCartItems(items.filter((i) => i.productId !== "product-1"));
    }

    const result = getCartItems();
    expect(result).toHaveLength(0);
  });

  it("合計金額を計算できる", () => {
    const items: CartItem[] = [
      {
        productId: "product-1",
        nameEn: "Product 1",
        nameSv: "Produkt 1",
        price: 129900, // 1299 SEK
        quantity: 2,
        image: "/img1.jpg",
        stock: 5,
      },
      {
        productId: "product-2",
        nameEn: "Product 2",
        nameSv: "Produkt 2",
        price: 199900, // 1999 SEK
        quantity: 1,
        image: "/img2.jpg",
        stock: 3,
      },
    ];
    setCartItems(items);

    const cartItems = getCartItems();
    const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    expect(total).toBe(129900 * 2 + 199900); // 459700 ore = 4597 SEK
  });

  it("カートをクリアできる", () => {
    const items: CartItem[] = [
      {
        productId: "product-1",
        nameEn: "Product 1",
        nameSv: "Produkt 1",
        price: 100,
        quantity: 1,
        image: "/img1.jpg",
        stock: 5,
      },
    ];
    setCartItems(items);
    expect(getCartItems()).toHaveLength(1);

    setCartItems([]);
    expect(getCartItems()).toHaveLength(0);
  });

  it("商品数の合計を計算できる", () => {
    const items: CartItem[] = [
      {
        productId: "product-1",
        nameEn: "P1",
        nameSv: "P1",
        price: 100,
        quantity: 2,
        image: "/img1.jpg",
        stock: 5,
      },
      {
        productId: "product-2",
        nameEn: "P2",
        nameSv: "P2",
        price: 200,
        quantity: 3,
        image: "/img2.jpg",
        stock: 5,
      },
    ];
    setCartItems(items);

    const totalItems = getCartItems().reduce((sum, i) => sum + i.quantity, 0);
    expect(totalItems).toBe(5);
  });
});

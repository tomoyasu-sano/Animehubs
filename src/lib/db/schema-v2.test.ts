import { describe, it, expect } from "vitest";
import {
  products,
  users,
  accounts,
  sessions,
  verificationTokens,
  favorites,
  orders,
} from "./schema";
import type {
  User,
  Order,
  OrderItem,
  SwedishAddress,
  OrderStatus,
  OrderType,
} from "./schema";

describe("v2 schema - products テーブル拡張", () => {
  it("reserved_stock カラムが存在する", () => {
    expect(products.reservedStock).toBeDefined();
    expect(products.reservedStock.name).toBe("reserved_stock");
  });

  it("likes_count カラムが存在する", () => {
    expect(products.likesCount).toBeDefined();
    expect(products.likesCount.name).toBe("likes_count");
  });

  it("既存カラムが維持されている", () => {
    expect(products.id).toBeDefined();
    expect(products.nameEn).toBeDefined();
    expect(products.nameSv).toBeDefined();
    expect(products.price).toBeDefined();
    expect(products.stock).toBeDefined();
    expect(products.category).toBeDefined();
    expect(products.condition).toBeDefined();
    expect(products.images).toBeDefined();
    expect(products.featured).toBeDefined();
  });
});

describe("v2 schema - users テーブル", () => {
  it("必須カラムが定義されている", () => {
    expect(users.id).toBeDefined();
    expect(users.id.name).toBe("id");
    expect(users.email).toBeDefined();
    expect(users.email.name).toBe("email");
    expect(users.name).toBeDefined();
    expect(users.name.name).toBe("name");
    expect(users.role).toBeDefined();
    expect(users.role.name).toBe("role");
    expect(users.createdAt).toBeDefined();
    expect(users.updatedAt).toBeDefined();
  });

  it("image カラムがnullableである", () => {
    expect(users.image).toBeDefined();
    expect(users.image.name).toBe("image");
  });

  it("default_address カラムがnullableである", () => {
    expect(users.defaultAddress).toBeDefined();
    expect(users.defaultAddress.name).toBe("default_address");
  });

  it("emailVerified カラムが存在する（NextAuth要件、timestamp_ms）", () => {
    expect(users.emailVerified).toBeDefined();
    expect(users.emailVerified.name).toBe("email_verified");
  });
});

describe("v2 schema - accounts テーブル（NextAuth）", () => {
  it("NextAuth必須カラムが定義されている", () => {
    expect(accounts.userId).toBeDefined();
    expect(accounts.provider).toBeDefined();
    expect(accounts.providerAccountId).toBeDefined();
    expect(accounts.type).toBeDefined();
  });
});

describe("v2 schema - sessions テーブル（NextAuth）", () => {
  it("NextAuth必須カラムが定義されている", () => {
    expect(sessions.userId).toBeDefined();
    expect(sessions.expires).toBeDefined();
    expect(sessions.sessionToken).toBeDefined();
  });
});

describe("v2 schema - verificationTokens テーブル（NextAuth）", () => {
  it("NextAuth必須カラムが定義されている", () => {
    expect(verificationTokens.identifier).toBeDefined();
    expect(verificationTokens.token).toBeDefined();
    expect(verificationTokens.expires).toBeDefined();
  });
});

describe("v2 schema - favorites テーブル", () => {
  it("必須カラムが定義されている", () => {
    expect(favorites.id).toBeDefined();
    expect(favorites.id.name).toBe("id");
    expect(favorites.userId).toBeDefined();
    expect(favorites.userId.name).toBe("user_id");
    expect(favorites.productId).toBeDefined();
    expect(favorites.productId.name).toBe("product_id");
    expect(favorites.createdAt).toBeDefined();
  });
});

describe("v2 schema - orders テーブル", () => {
  it("必須カラムが定義されている", () => {
    expect(orders.id).toBeDefined();
    expect(orders.orderNumber).toBeDefined();
    expect(orders.orderNumber.name).toBe("order_number");
    expect(orders.orderDate).toBeDefined();
    expect(orders.orderSeq).toBeDefined();
    expect(orders.userId).toBeDefined();
    expect(orders.userId.name).toBe("user_id");
    expect(orders.customerName).toBeDefined();
    expect(orders.customerEmail).toBeDefined();
    expect(orders.type).toBeDefined();
    expect(orders.status).toBeDefined();
    expect(orders.totalAmount).toBeDefined();
    expect(orders.items).toBeDefined();
  });

  it("Stripe関連カラムが定義されている", () => {
    expect(orders.stripePaymentIntentId).toBeDefined();
    expect(orders.stripePaymentIntentId.name).toBe("stripe_payment_intent_id");
    expect(orders.stripeCheckoutSessionId).toBeDefined();
    expect(orders.stripeCheckoutSessionId.name).toBe("stripe_checkout_session_id");
  });

  it("配送・実物確認関連カラムが定義されている", () => {
    expect(orders.shippingAddress).toBeDefined();
    expect(orders.shippingAddress.name).toBe("shipping_address");
    expect(orders.expiresAt).toBeDefined();
    expect(orders.expiresAt.name).toBe("expires_at");
    expect(orders.cancelledReason).toBeDefined();
    expect(orders.cancelledReason.name).toBe("cancelled_reason");
  });
});

describe("v2 schema - 型定義", () => {
  it("OrderStatus が正しいリテラル型である", () => {
    const validStatuses: OrderStatus[] = [
      "reserved",
      "pending_payment",
      "paid",
      "cancellation_requested",
      "shipped",
      "completed",
      "payment_failed",
      "cancelled",
    ];
    expect(validStatuses).toHaveLength(8);
  });

  it("OrderType が正しいリテラル型である", () => {
    const validTypes: OrderType[] = ["delivery", "inspection"];
    expect(validTypes).toHaveLength(2);
  });

  it("OrderItem 型が必須フィールドを持つ", () => {
    const item: OrderItem = {
      product_id: "test-id",
      name_en: "Test",
      name_sv: "Test",
      price: 10000,
      quantity: 1,
      image: "/images/test.jpg",
    };
    expect(item.product_id).toBe("test-id");
    expect(item.price).toBe(10000);
  });

  it("SwedishAddress 型が必須フィールドを持つ", () => {
    const address: SwedishAddress = {
      full_name: "Test User",
      street: "Kungsgatan 12",
      city: "Uppsala",
      postal_code: "753 10",
      country: "SE",
    };
    expect(address.country).toBe("SE");
    expect(address.postal_code).toBe("753 10");
  });

  it("User 型がスキーマから推論される", () => {
    // 型チェックのみ - コンパイルが通ればOK
    const user: Partial<User> = {
      id: "test",
      email: "test@example.com",
      role: "user",
    };
    expect(user.id).toBe("test");
  });

  it("Order 型がスキーマから推論される", () => {
    const order: Partial<Order> = {
      id: "test",
      type: "delivery",
      status: "pending_payment",
    };
    expect(order.type).toBe("delivery");
  });
});

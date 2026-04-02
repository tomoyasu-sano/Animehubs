import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  unique,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// 型定義（ドメインモデル）
// ============================================================

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "cancellation_requested"
  | "pending_inspection"
  | "shipped"
  | "completed"
  | "payment_failed"
  | "cancelled";

export type OrderType = "delivery" | "inspection";

export type OrderItem = {
  product_id: string;
  name_en: string;
  name_sv: string;
  price: number;
  quantity: number;
  image: string;
};

export type SwedishAddress = {
  full_name: string;
  street: string;
  city: string;
  postal_code: string;
  country: "SE";
};

// ============================================================
// 商品テーブル（v2拡張: reserved_stock, likes_count 追加）
// ============================================================

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameSv: text("name_sv").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionSv: text("description_sv").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull().default(1),
  reservedStock: integer("reserved_stock").notNull().default(0),
  category: text("category").notNull(),
  condition: text("condition").notNull(),
  images: text("images").notNull().default("[]"),
  featured: integer("featured").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ============================================================
// 予約テーブル（v1互換、Phase 1-4でarchiveにリネーム）
// ============================================================

export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  location: text("location").notNull(),
  timeSlot: text("time_slot").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: integer("total_amount").notNull(),
  items: text("items").notNull(),
  accessToken: text("access_token").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ============================================================
// ユーザーテーブル（v2新規）
// ============================================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  role: text("role").notNull().default("user"),
  defaultAddress: text("default_address"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ============================================================
// NextAuth.js v5 テーブル群
// ============================================================

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: text("expires").notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: text("expires").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ],
);

// ============================================================
// お気に入りテーブル（v2新規）
// ============================================================

export const favorites = sqliteTable(
  "favorites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    unique("favorites_user_product_unique").on(table.userId, table.productId),
  ],
);

// ============================================================
// 注文テーブル（v2新規、旧reservationsを置換）
// ============================================================

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  orderDate: text("order_date").notNull(),
  orderSeq: integer("order_seq").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending_payment"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  totalAmount: integer("total_amount").notNull(),
  items: text("items").notNull(),
  shippingAddress: text("shipping_address"),
  expiresAt: text("expires_at"),
  cancelledReason: text("cancelled_reason"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ============================================================
// 管理者テーブル（v2で廃止予定、互換性のため残す）
// ============================================================

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

// ============================================================
// 型エクスポート
// ============================================================

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

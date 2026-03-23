import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 商品テーブル
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameSv: text("name_sv").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionSv: text("description_sv").notNull(),
  price: integer("price").notNull(), // オーレ単位 (1 SEK = 100 ore)
  stock: integer("stock").notNull().default(1),
  category: text("category").notNull(),
  condition: text("condition").notNull(),
  images: text("images").notNull().default("[]"), // JSON配列
  featured: integer("featured").notNull().default(0), // 0/1
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 予約テーブル
export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  location: text("location").notNull(),
  timeSlot: text("time_slot").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: integer("total_amount").notNull(),
  items: text("items").notNull(), // JSON
  accessToken: text("access_token").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 管理者テーブル
export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

// 型定義のエクスポート
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;

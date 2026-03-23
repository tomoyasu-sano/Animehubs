import { describe, it, expect, beforeEach } from "vitest";
import { initializeDatabase, getDb, schema } from "./index";
import {
  getAdminByUsername,
  adminGetProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adminGetReservations,
  getDashboardStats,
} from "./admin-queries";
import bcrypt from "bcryptjs";

// テスト前にDBを初期化しシードデータを投入
beforeEach(() => {
  // テスト用にメモリDB環境変数を設定
  process.env.DATABASE_URL = "./data/test-admin.db";
  initializeDatabase();
  const db = getDb();

  // テーブルをクリア
  db.delete(schema.products).run();
  db.delete(schema.reservations).run();
  db.delete(schema.adminUsers).run();

  // テスト用管理者を投入
  db.insert(schema.adminUsers)
    .values({
      id: "admin-test-1",
      username: "testadmin",
      passwordHash: bcrypt.hashSync("testpass", 10),
      createdAt: new Date().toISOString(),
    })
    .run();

  // テスト用商品を投入
  db.insert(schema.products)
    .values({
      id: "prod-1",
      nameEn: "Test Figure 1",
      nameSv: "Testfigur 1",
      descriptionEn: "A test figure",
      descriptionSv: "En testfigur",
      price: 10000,
      stock: 5,
      category: "figures",
      condition: "new",
      images: "[]",
      featured: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    .run();

  db.insert(schema.products)
    .values({
      id: "prod-2",
      nameEn: "Nendoroid Test",
      nameSv: "Nendoroid Test",
      descriptionEn: "A nendoroid",
      descriptionSv: "En nendoroid",
      price: 50000,
      stock: 2,
      category: "nendoroid",
      condition: "like_new",
      images: "[]",
      featured: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    })
    .run();

  // テスト用予約を投入
  db.insert(schema.reservations)
    .values({
      id: "res-1",
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      location: "central-station",
      timeSlot: "weekend-morning",
      status: "confirmed",
      totalAmount: 10000,
      items: JSON.stringify([
        { productId: "prod-1", nameEn: "Test Figure 1", nameSv: "Testfigur 1", quantity: 1, price: 10000 },
      ]),
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    })
    .run();
});

describe("admin-queries", () => {
  describe("getAdminByUsername", () => {
    it("should find admin by username", () => {
      const admin = getAdminByUsername("testadmin");
      expect(admin).toBeDefined();
      expect(admin!.username).toBe("testadmin");
    });

    it("should return undefined for non-existent username", () => {
      const admin = getAdminByUsername("nonexistent");
      expect(admin).toBeUndefined();
    });
  });

  describe("adminGetProducts", () => {
    it("should return all products", () => {
      const result = adminGetProducts();
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it("should filter by category", () => {
      const result = adminGetProducts({ category: "nendoroid" });
      expect(result.total).toBe(1);
      expect(result.items[0].category).toBe("nendoroid");
    });

    it("should filter by search term", () => {
      const result = adminGetProducts({ search: "Nendoroid" });
      expect(result.total).toBe(1);
      expect(result.items[0].nameEn).toBe("Nendoroid Test");
    });
  });

  describe("createProduct", () => {
    it("should create a product", () => {
      const product = createProduct({
        nameEn: "New Product",
        nameSv: "Ny Produkt",
        descriptionEn: "Description",
        descriptionSv: "Beskrivning",
        price: 30000,
        stock: 3,
        category: "figma",
        condition: "new",
        images: "[]",
        featured: 0,
      });

      expect(product.nameEn).toBe("New Product");
      expect(product.price).toBe(30000);
      expect(product.id).toBeDefined();
    });
  });

  describe("updateProduct", () => {
    it("should update product fields", () => {
      const updated = updateProduct("prod-1", { price: 15000, stock: 10 });
      expect(updated).toBeDefined();
      expect(updated!.price).toBe(15000);
      expect(updated!.stock).toBe(10);
    });

    it("should return undefined for non-existent product", () => {
      const result = updateProduct("nonexistent", { price: 999 });
      expect(result).toBeUndefined();
    });
  });

  describe("deleteProduct", () => {
    it("should delete a product", () => {
      const result = deleteProduct("prod-1");
      expect(result).toBe(true);

      const products = adminGetProducts();
      expect(products.total).toBe(1);
    });

    it("should return false for non-existent product", () => {
      expect(deleteProduct("nonexistent")).toBe(false);
    });
  });

  describe("adminGetReservations", () => {
    it("should return all reservations", () => {
      const result = adminGetReservations();
      expect(result.total).toBe(1);
    });

    it("should filter by status", () => {
      const confirmed = adminGetReservations({ status: "confirmed" });
      expect(confirmed.total).toBe(1);

      const pending = adminGetReservations({ status: "pending" });
      expect(pending.total).toBe(0);
    });
  });

  describe("getDashboardStats", () => {
    it("should return dashboard statistics", () => {
      const stats = getDashboardStats();
      expect(stats.totalProducts).toBe(2);
      expect(stats.totalReservations).toBe(1);
      expect(stats.totalRevenue).toBe(10000);
      expect(stats.confirmedReservations).toBe(1);
      expect(stats.pendingReservations).toBe(0);
    });
  });
});

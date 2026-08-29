/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import type { Product } from "@/lib/db/schema";

// next-intl モック
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// next-auth/react モック
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

// next/navigation モック
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/en/products",
}));

// @/i18n/navigation モック
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

// next/image モック
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) =>
    React.createElement("img", { alt, ...props }),
}));

import RecommendedProductsGrid from "./RecommendedProductsGrid";

function createProduct(overrides: Partial<Product> & { id: string }): Product {
  return {
    id: overrides.id,
    nameEn: overrides.nameEn ?? `Product ${overrides.id}`,
    nameSv: overrides.nameSv ?? `Produkt ${overrides.id}`,
    descriptionEn: overrides.descriptionEn ?? "Description",
    descriptionSv: overrides.descriptionSv ?? "Beskrivning",
    price: overrides.price ?? 1000,
    stock: overrides.stock ?? 1,
    reservedStock: overrides.reservedStock ?? 0,
    category: overrides.category ?? "figures",
    condition: overrides.condition ?? "new",
    heightCm: overrides.heightCm ?? null,
    costSek: overrides.costSek ?? null,
    images: overrides.images ?? "[]",
    featured: overrides.featured ?? 0,
    featuredOrder: overrides.featuredOrder ?? 0,
    likesCount: overrides.likesCount ?? 0,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00Z",
  };
}

describe("RecommendedProductsGrid", () => {
  it("products に応じた件数のカードが表示される", () => {
    const products = [
      createProduct({ id: "p1", nameEn: "Figure Alpha" }),
      createProduct({ id: "p2", nameEn: "Figure Beta" }),
      createProduct({ id: "p3", nameEn: "Figure Gamma" }),
    ];

    render(<RecommendedProductsGrid products={products} />);

    expect(screen.getByText("Figure Alpha")).toBeInTheDocument();
    expect(screen.getByText("Figure Beta")).toBeInTheDocument();
    expect(screen.getByText("Figure Gamma")).toBeInTheDocument();
  });

  it("4件の商品が全て表示される", () => {
    const products = Array.from({ length: 4 }, (_, i) =>
      createProduct({ id: `p${i}`, nameEn: `Product ${i}` }),
    );

    render(<RecommendedProductsGrid products={products} />);

    for (let i = 0; i < 4; i++) {
      expect(screen.getByText(`Product ${i}`)).toBeInTheDocument();
    }
  });

  it("1件の商品でも正しく表示される", () => {
    const products = [createProduct({ id: "p1", nameEn: "Solo Figure" })];

    render(<RecommendedProductsGrid products={products} />);

    expect(screen.getByText("Solo Figure")).toBeInTheDocument();
  });
});

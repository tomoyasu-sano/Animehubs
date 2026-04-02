import { describe, it, expect, vi, beforeEach } from "vitest";

// next-intl/middleware のモック
vi.mock("next-intl/middleware", () => ({
  default: vi.fn(() => vi.fn(() => new Response(null, { status: 200 }))),
}));

// next-intl routing のモック
vi.mock("./i18n/routing", () => ({
  routing: {
    locales: ["en", "sv"],
    defaultLocale: "en",
  },
}));

// next-auth のモック
const mockAuth = vi.fn();
vi.mock("./lib/auth-v2", () => ({
  auth: mockAuth,
}));

describe("middleware - ルート保護", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAuth.mockReset();
  });

  // 保護対象パスの定義テスト
  it("PROTECTED_PATHS が正しく定義されている", async () => {
    const { PROTECTED_PATHS } = await import("./middleware");
    expect(PROTECTED_PATHS).toContain("/cart");
    expect(PROTECTED_PATHS).toContain("/checkout");
    expect(PROTECTED_PATHS).toContain("/favorites");
    expect(PROTECTED_PATHS).toContain("/orders");
    expect(PROTECTED_PATHS).toContain("/account");
  });

  it("ADMIN_PATHS が正しく定義されている", async () => {
    const { ADMIN_PATHS } = await import("./middleware");
    expect(ADMIN_PATHS).toContain("/admin");
  });

  // isProtectedPath 関数のテスト
  it("保護対象パスを正しく判定する", async () => {
    const { isProtectedPath } = await import("./middleware");
    expect(isProtectedPath("/en/cart")).toBe(true);
    expect(isProtectedPath("/sv/cart")).toBe(true);
    expect(isProtectedPath("/en/checkout/delivery")).toBe(true);
    expect(isProtectedPath("/en/favorites")).toBe(true);
    expect(isProtectedPath("/en/orders")).toBe(true);
    expect(isProtectedPath("/en/orders/123")).toBe(true);
    expect(isProtectedPath("/en/account")).toBe(true);
    // auth/login 自体は保護対象外
    expect(isProtectedPath("/en/auth/login")).toBe(false);
  });

  it("非保護パスを正しく判定する", async () => {
    const { isProtectedPath } = await import("./middleware");
    expect(isProtectedPath("/en")).toBe(false);
    expect(isProtectedPath("/en/products")).toBe(false);
    expect(isProtectedPath("/en/products/123")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  // isAdminPath 関数のテスト
  it("管理者パスを正しく判定する", async () => {
    const { isAdminPath } = await import("./middleware");
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/products")).toBe(true);
    expect(isAdminPath("/admin/orders")).toBe(true);
  });

  it("管理者以外のパスを正しく判定する", async () => {
    const { isAdminPath } = await import("./middleware");
    expect(isAdminPath("/en/products")).toBe(false);
    expect(isAdminPath("/en/cart")).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// NextAuth のモック
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: vi.fn(() => ({})),
}));

describe("auth-v2 config", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long!!");
    vi.stubEnv("AUTH_GOOGLE_ID", "test-google-id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
    vi.resetModules();
  });

  it("authConfig がエクスポートされる", async () => {
    const mod = await import("./auth-v2");
    expect(mod.authConfig).toBeDefined();
    expect(mod.authConfig.providers).toBeDefined();
    expect(mod.authConfig.providers.length).toBeGreaterThan(0);
  });

  it("handlers, auth, signIn, signOut がエクスポートされる", async () => {
    const mod = await import("./auth-v2");
    expect(mod.handlers).toBeDefined();
    expect(mod.auth).toBeDefined();
    expect(mod.signIn).toBeDefined();
    expect(mod.signOut).toBeDefined();
  });
});

describe("ADMIN_EMAILS 定数", () => {
  it("管理者メールリストが定義されている", async () => {
    const { ADMIN_EMAILS } = await import("./constants");
    expect(ADMIN_EMAILS).toBeDefined();
    expect(Array.isArray(ADMIN_EMAILS)).toBe(true);
    expect(ADMIN_EMAILS.length).toBeGreaterThan(0);
  });

  it("anytimes.sano@gmail.com が含まれる", async () => {
    const { ADMIN_EMAILS } = await import("./constants");
    expect(ADMIN_EMAILS).toContain("anytimes.sano@gmail.com");
  });

  it("asa5ng13@gmail.com が含まれる", async () => {
    const { ADMIN_EMAILS } = await import("./constants");
    expect(ADMIN_EMAILS).toContain("asa5ng13@gmail.com");
  });
});

describe("isAdminEmail ヘルパー", () => {
  it("管理者メールに対してtrueを返す", async () => {
    const { isAdminEmail } = await import("./auth-v2");
    expect(isAdminEmail("anytimes.sano@gmail.com")).toBe(true);
    expect(isAdminEmail("asa5ng13@gmail.com")).toBe(true);
  });

  it("一般メールに対してfalseを返す", async () => {
    const { isAdminEmail } = await import("./auth-v2");
    expect(isAdminEmail("random@example.com")).toBe(false);
  });

  it("大文字小文字を無視して判定する", async () => {
    const { isAdminEmail } = await import("./auth-v2");
    expect(isAdminEmail("Anytimes.Sano@Gmail.com")).toBe(true);
  });

  it("空文字・undefined・null に対してfalseを返す", async () => {
    const { isAdminEmail } = await import("./auth-v2");
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});

describe("CURRENCY / CURRENCY_SYMBOL 定数", () => {
  it("SEK 通貨が定義されている", async () => {
    const { CURRENCY, CURRENCY_SYMBOL } = await import("./constants");
    expect(CURRENCY).toBe("SEK");
    expect(CURRENCY_SYMBOL).toBe("kr");
  });
});

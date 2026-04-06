"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Heart, Menu, X, Package, Globe, ShoppingCart, Grid, LogIn, LogOut, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import CartButton from "./CartButton";
import OrdersLink from "./OrdersLink";

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { status } = useSession();
  const { totalItems } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isHome = pathname === "/";
  const isAuthenticated = mounted && status === "authenticated";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // モバイルメニュー開閉時にスクロールロック
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLocaleSwitch = () => {
    const newLocale = locale === "en" ? "sv" : "en";
    window.location.href = `/${newLocale}${pathname}`;
  };

  // トップページ or 商品詳細 & 未スクロール → 透過、それ以外 → 背景付き
  const isProductDetail = /^\/products\/[^/]+$/.test(pathname);
  const isTransparent = (isHome || isProductDetail) && !scrolled && !mobileMenuOpen;

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isTransparent
          ? "border-b border-transparent bg-transparent"
          : mobileMenuOpen
            ? "border-b border-neutral-800 bg-[#0a0a0a]"
            : "border-b border-neutral-800 bg-[var(--color-header)]/95 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
        {/* スマホ: ハンバーガー（左端） */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="cursor-pointer rounded-md p-2 text-white/80 transition-all hover:text-white md:hidden"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* ロゴ（中央寄り on スマホ、左寄り on PC） */}
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          {t("common.siteName")}
        </Link>

        {/* PC: ナビゲーション（Productsのみ） */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/products"
            className={cn(
              "text-sm font-medium transition-colors hover:text-white",
              pathname === "/products" || pathname.startsWith("/products/")
                ? "text-white"
                : "text-white/70"
            )}
          >
            {t("common.products")}
          </Link>
        </nav>

        {/* PC: アクションアイコン */}
        <div className="hidden items-center gap-1 md:flex">
          {/* 言語切替 */}
          <button
            onClick={handleLocaleSwitch}
            className="cursor-pointer flex items-center gap-1 rounded-md p-2 text-white/70 transition-all hover:text-white"
            aria-label={t("common.language")}
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs uppercase">{locale === "en" ? "SV" : "EN"}</span>
          </button>

          {/* お気に入り */}
          <Link
            href="/favorites"
            className="cursor-pointer rounded-md p-2 text-white/70 transition-all hover:text-white"
            aria-label={t("common.favorites")}
          >
            <Heart className="h-5 w-5" />
          </Link>

          {/* 注文 */}
          <OrdersLink />

          {/* カート */}
          <CartButton />

          {/* 認証 */}
          {mounted && isAuthenticated ? (
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-white/70 transition-all hover:text-white"
              aria-label={t("common.logout")}
            >
              {t("common.logout")}
            </button>
          ) : mounted ? (
            <Link
              href="/auth/login"
              className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-white/70 transition-all hover:text-white"
            >
              {t("common.login")}
            </Link>
          ) : null}
        </div>

        {/* スマホ: 右側カートアイコン */}
        <div className="md:hidden">
          <CartButton />
        </div>
      </div>

      {/* モバイルメニュー: 背景オーバーレイ */}
      <div
        className={cn(
          "fixed inset-0 top-16 z-30 bg-black/60 transition-opacity duration-300 md:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* モバイルメニュー: 左からスライドするドロワー */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 top-16 z-40 w-72 overflow-hidden bg-[#0a0a0a] transition-transform duration-300 ease-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav
          className={cn(
            "flex flex-col gap-1 px-4 py-6 transition-opacity duration-200",
            mobileMenuOpen ? "opacity-100 delay-150" : "opacity-0 delay-0"
          )}
        >
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors hover:text-white",
              pathname === "/products" || pathname.startsWith("/products/")
                ? "text-white"
                : "text-white/70"
            )}
          >
            <Grid className="h-5 w-5" />
            {t("common.products")}
          </Link>

          <Link
            href="/favorites"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-white/70 transition-colors hover:text-white"
          >
            <Heart className="h-5 w-5" />
            {t("common.favorites")}
          </Link>

          <Link
            href="/cart"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-white/70 transition-colors hover:text-white"
          >
            <ShoppingCart className="h-5 w-5" />
            {t("common.cart")}
            {mounted && totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>

          {isAuthenticated && (
            <Link
              href="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-white/70 transition-colors hover:text-white"
            >
              <Package className="h-5 w-5" />
              {t("common.orders")}
            </Link>
          )}

          <div className="my-3 h-px bg-neutral-800" />

          {/* About Us */}
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors hover:text-white",
              pathname === "/about" ? "text-white" : "text-white/70"
            )}
          >
            <Info className="h-5 w-5" />
            {t("footer.aboutUs")}
          </Link>

          {/* 言語切替 */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLocaleSwitch();
            }}
            className="cursor-pointer flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-white/70 transition-colors hover:text-white"
          >
            <Globe className="h-5 w-5" />
            {locale === "en" ? "Svenska" : "English"}
          </button>

          {/* 認証 */}
          {mounted && isAuthenticated ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut({ callbackUrl: `/${locale}` });
              }}
              className="cursor-pointer flex items-center gap-3 rounded-md px-3 py-3 text-left text-base font-medium text-white/70 transition-colors hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              {t("common.logout")}
            </button>
          ) : mounted ? (
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-white/70 transition-colors hover:text-white"
            >
              <LogIn className="h-5 w-5" />
              {t("common.login")}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

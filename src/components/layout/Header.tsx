"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Heart, ShoppingCart, Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import CartSidebar from "@/components/cart/CartSidebar";

export default function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();

  const handleLocaleSwitch = () => {
    const newLocale = locale === "en" ? "sv" : "en";
    router.replace(pathname, { locale: newLocale });
  };

  const navLinks = [
    { href: "/", label: t("common.home") },
    { href: "/products", label: t("common.products") },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[var(--color-header)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ロゴ */}
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            {t("common.siteName")}
          </Link>

          {/* デスクトップナビゲーション */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-white",
                  pathname === link.href ? "text-white" : "text-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* アクションボタン */}
          <div className="flex items-center gap-3">
            {/* 言語切替 */}
            <button
              onClick={handleLocaleSwitch}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:text-white"
              aria-label={t("common.language")}
            >
              <Globe className="h-4 w-4" />
              <span className="uppercase">{locale === "en" ? "SV" : "EN"}</span>
            </button>

            {/* お気に入り */}
            <Link
              href="/products"
              className="rounded-md p-2 text-muted transition-colors hover:text-white"
              aria-label={t("common.favorites")}
            >
              <Heart className="h-5 w-5" />
            </Link>

            {/* カート */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded-md p-2 text-muted transition-colors hover:text-white"
              aria-label={t("common.cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>

            {/* モバイルメニュートグル */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-md p-2 text-muted transition-colors hover:text-white md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {mobileMenuOpen && (
          <div className="border-t border-border md:hidden">
            <nav className="flex flex-col px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-white",
                    pathname === link.href ? "text-white" : "text-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-white"
              >
                {t("common.cart")} {totalItems > 0 && `(${totalItems})`}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* カートサイドバー */}
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

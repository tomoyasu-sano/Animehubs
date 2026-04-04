"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import LocaleSwitcher from "./LocaleSwitcher";
import CartButton from "./CartButton";
import AuthButton from "./AuthButton";
import OrdersLink from "./OrdersLink";

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { status } = useSession();
  const { totalItems } = useCart();

  const navLinks = [
    { href: "/", label: t("common.home") },
    { href: "/products", label: t("common.products") },
  ];

  return (
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
          <LocaleSwitcher />

          <Link
            href="/favorites"
            className="cursor-pointer rounded-md p-2 text-muted transition-all hover:scale-110 hover:text-white"
            aria-label={t("common.favorites")}
          >
            <Heart className="h-5 w-5" />
          </Link>

          <OrdersLink />
          <CartButton />
          <AuthButton />

          {/* モバイルメニュートグル */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="cursor-pointer rounded-md p-2 text-muted transition-all hover:scale-110 hover:text-white md:hidden"
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
            {status === "authenticated" && (
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-white"
              >
                {t("common.orders")}
              </Link>
            )}
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
  );
}

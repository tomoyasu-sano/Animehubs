"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogIn, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function AuthButton() {
  const t = useTranslations("common");
  const locale = useLocale();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = mounted && status === "authenticated";

  if (!mounted) return null;

  if (isAuthenticated) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: `/${locale}` })}
        className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted transition-all hover:scale-105 hover:text-white"
        aria-label={t("logout")}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{t("logout")}</span>
      </button>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted transition-all hover:scale-105 hover:text-white"
    >
      <LogIn className="h-4 w-4" />
      <span className="hidden sm:inline">{t("login")}</span>
    </Link>
  );
}

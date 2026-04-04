"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Package } from "lucide-react";
import { useSession } from "next-auth/react";

export default function OrdersLink() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [hasNewReservation, setHasNewReservation] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = mounted && status === "authenticated";

  useEffect(() => {
    const check = () => {
      setHasNewReservation(localStorage.getItem("hasNewReservation") === "true");
    };
    check();
    window.addEventListener("storage", check);
    window.addEventListener("newReservation", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("newReservation", check);
    };
  }, []);

  useEffect(() => {
    if (pathname === "/orders") {
      localStorage.removeItem("hasNewReservation");
      setHasNewReservation(false);
    }
  }, [pathname]);

  if (!isAuthenticated) return null;

  return (
    <Link
      href="/orders"
      className="cursor-pointer relative rounded-md p-2 text-muted transition-all hover:scale-110 hover:text-white"
      aria-label={t("orders")}
    >
      <Package className="h-5 w-5" />
      {mounted && hasNewReservation && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
          !
        </span>
      )}
    </Link>
  );
}

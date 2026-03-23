"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const COOKIE_CONSENT_KEY = "animehubs-cookie-consent";

function getInitialVisibility(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(COOKIE_CONSENT_KEY);
}

export default function CookieBanner() {
  const t = useTranslations("cookie");
  const [visible, setVisible] = useState(getInitialVisibility);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:px-6"
      role="alert"
      aria-live="polite"
    >
      <p className="text-sm text-muted">{t("message")}</p>
      <div className="mt-3 flex items-center gap-3 sm:mt-0">
        <Link
          href="/privacy"
          className="text-sm text-muted underline transition-colors hover:text-foreground"
        >
          {t("learnMore")}
        </Link>
        <button
          onClick={handleAccept}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations();
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/animehubs_placeholder";

  return (
    <footer className="border-t border-neutral-800 bg-[var(--color-footer)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* ブランド */}
          <div>
            <h3 className="text-lg font-bold text-white">{t("common.siteName")}</h3>
            <p className="mt-2 text-sm text-muted">{t("common.tagline")}</p>
            <p className="mt-1 text-sm text-muted">{t("footer.localPickup")}</p>
          </div>

          {/* リンク */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              {t("footer.followUs")}
            </h4>
            <div className="mt-4 space-y-2">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                {t("footer.instagram")}
              </a>
            </div>
          </div>

          {/* プライバシーポリシー */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              {t("footer.privacyPolicy")}
            </h4>
            <div className="mt-4">
              <Link
                href="/privacy"
                className="text-sm text-muted transition-colors hover:text-white"
              >
                {t("footer.privacyPolicy")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {t("common.siteName")}. {t("footer.rightsReserved")}.
          </p>
        </div>
      </div>
    </footer>
  );
}

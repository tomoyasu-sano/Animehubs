"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Bell, Check } from "lucide-react";

interface AnnouncementBannerProps {
  announcement: {
    messageEn: string;
    messageSv: string;
  } | null;
}

export default function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const router = useRouter();
  const { status } = useSession();

  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [error, setError] = useState("");

  // 購読状態を取得
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/newsletter/status")
        .then((res) => res.json() as Promise<{ subscribed: boolean }>)
        .then((data) => setSubscribed(data.subscribed))
        .catch(() => setSubscribed(false));
    } else {
      setSubscribed(false);
    }
  }, [status]);

  // subscribe=true クエリパラメータ検出（未ログインからのリダイレクト後）
  useEffect(() => {
    if (status !== "authenticated") return;
    if (subscribed === true) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribe") === "true") {
      setShowConfirm(true);
      // URL からパラメータを除去
      const url = new URL(window.location.href);
      url.searchParams.delete("subscribe");
      window.history.replaceState({}, "", url.toString());
    }
  }, [status, subscribed]);

  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) {
        setSubscribed(true);
        setJustSubscribed(true);
        setTimeout(() => setJustSubscribed(false), 3000);
      } else {
        setError(t("errorMessage"));
      }
    } catch {
      setError(t("errorMessage"));
    } finally {
      setSubscribing(false);
      setShowConfirm(false);
    }
  }, [locale, t]);

  const handleButtonClick = useCallback(() => {
    if (status !== "authenticated") {
      // 未ログイン → ログインページへ（戻りURLに subscribe=true を付与）
      const callbackUrl = `/${locale}?subscribe=true`;
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    // ログイン済み → GDPR確認ダイアログを表示
    setShowConfirm(true);
  }, [status, locale, router]);

  if (!announcement) return null;

  const message = locale === "sv" ? announcement.messageSv : announcement.messageEn;

  return (
    <>
      {/* バナー */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-white">{message}</p>
          {subscribed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white">
              <Check className="h-4 w-4" />
              {t("subscribedButton")}
            </span>
          ) : (
            <button
              onClick={handleButtonClick}
              disabled={subscribing}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              {status === "authenticated"
                ? t("subscribeButton")
                : t("bannerButton")}
            </button>
          )}
        </div>
        {/* 登録成功フィードバック */}
        {justSubscribed && (
          <div className="mx-auto mt-2 max-w-7xl">
            <p className="text-center text-sm font-medium text-white/90" role="alert">
              {t("successMessage")}
            </p>
          </div>
        )}
        {/* エラーフィードバック */}
        {error && (
          <div className="mx-auto mt-2 max-w-7xl">
            <p className="text-center text-sm font-medium text-red-200" role="alert">
              {error}
            </p>
          </div>
        )}
      </div>

      {/* GDPR 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">{t("confirmTitle")}</h3>
            <p className="mt-2 text-sm text-muted">{t("confirmMessage")}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
              >
                {t("confirmNo")}
              </button>
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
              >
                {t("confirmYes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

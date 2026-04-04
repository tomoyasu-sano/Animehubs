"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useCart } from "@/hooks/useCart";
import { useRouter } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils";
import { AlertTriangle, MapPin } from "lucide-react";

export default function InspectionForm() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const { data: session } = useSession();
  const { items, totalAmount, clearCart } = useCart();
  const router = useRouter();

  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function validateEmail(): boolean {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t("errors.emailInvalid"));
      return false;
    }
    setEmailError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed || !validateEmail()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/checkout/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          email,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        orderId?: string;
        orderNumber?: string;
      };

      if (!res.ok) {
        if (res.status === 409) {
          setServerError(t("errors.outOfStock"));
        } else if (res.status === 429) {
          setServerError(t("errors.tooManyReservations"));
        } else {
          setServerError(data.error || t("errors.serverError"));
        }
        return;
      }

      clearCart();
      localStorage.setItem("hasNewReservation", "true");
      window.dispatchEvent(new Event("newReservation"));
      router.replace(`/orders/${data.orderId}`);
    } catch {
      setServerError(t("errors.serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 注意事項 */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
            <p>{t("inspectionNotice1")}</p>
            <p>{t("inspectionNotice2")}</p>
            <p>{t("inspectionNotice3")}</p>
          </div>
        </div>
      </div>

      {/* 受け渡し場所 */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
        <MapPin className="h-5 w-5 flex-shrink-0 text-muted" />
        <span className="text-sm font-medium text-foreground">
          {t("inspectionMeetingPlace")}
        </span>
      </div>

      {/* 同意チェックボックス */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-foreground focus:ring-foreground/20"
        />
        <span className="text-sm text-foreground">
          {t("inspectionAgree")}
        </span>
      </label>

      {/* メールアドレス */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          {t("email")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          placeholder={t("emailPlaceholder")}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
            emailError ? "border-destructive" : "border-border"
          } bg-background`}
        />
        {emailError && (
          <p className="mt-1 text-xs text-destructive">{emailError}</p>
        )}
      </div>

      {/* 注文サマリー */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("orderSummary")}
        </h3>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted">
                {item.nameEn} x{item.quantity}
              </span>
              <span className="text-foreground">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {t("total")}
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {t("inspectionNoCharge")}
            </p>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={submitting || !agreed || items.length === 0}
        className="w-full rounded-lg bg-foreground py-3 text-sm font-semibold text-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t("processing") : t("reserveForInspection")}
      </button>
    </form>
  );
}

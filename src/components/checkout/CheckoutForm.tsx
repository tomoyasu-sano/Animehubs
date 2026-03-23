"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { useCart, type CartItem } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import LocationPicker from "./LocationPicker";
import TimeSlotPicker from "./TimeSlotPicker";

interface FormErrors {
  name?: string;
  email?: string;
  location?: string;
  timeSlot?: string;
}

export default function CheckoutForm() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [useInstagram, setUseInstagram] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    if (!name || name.trim().length < 2) {
      newErrors.name = t("errors.nameRequired");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      newErrors.email = t("errors.emailInvalid");
    }
    if (!useInstagram) {
      if (!location) {
        newErrors.location = t("errors.locationRequired");
      }
      if (!timeSlot) {
        newErrors.timeSlot = t("errors.timeSlotRequired");
      }
    }
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const reservationItems = items.map((item: CartItem) => ({
        productId: item.productId,
        nameEn: item.nameEn,
        nameSv: item.nameSv,
        quantity: item.quantity,
        price: item.price,
      }));

      const body = {
        customerName: name.trim(),
        customerEmail: email.trim(),
        location: useInstagram ? "instagram" : location,
        timeSlot: useInstagram ? "instagram" : timeSlot,
        items: reservationItems,
        totalAmount,
        notes: useInstagram ? "Customer prefers Instagram communication" : undefined,
        locale,
      };

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || t("errors.serverError"));
        return;
      }

      // カートをクリアして確認ページへ
      clearCart();
      router.push(`/checkout/confirm?id=${data.id}&token=${data.accessToken}`);
    } catch {
      setServerError(t("errors.serverError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 注文サマリー */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t("orderSummary")}</h3>
        <div className="space-y-2">
          {items.map((item) => {
            const itemName = locale === "sv" ? item.nameSv : item.nameEn;
            return (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {itemName} x {item.quantity}
                </span>
                <span className="text-foreground">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{t("total")}</span>
            <span className="text-lg font-bold text-foreground">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 名前 */}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          {t("name")} *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className={`w-full rounded-lg border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
            errors.name ? "border-destructive" : "border-border"
          }`}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* メール */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          {t("email")} *
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className={`w-full rounded-lg border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
            errors.email ? "border-destructive" : "border-border"
          }`}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      {/* Instagram オプション */}
      <div className="rounded-lg border border-border bg-card p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={useInstagram}
            onChange={(e) => setUseInstagram(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
          />
          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <MessageCircle className="h-4 w-4" />
              {t("contactViaInstagram")}
            </div>
            <p className="mt-1 text-xs text-muted">{t("instagramDescription")}</p>
          </div>
        </label>
      </div>

      {/* 場所・時間帯（Instagram未選択時のみ） */}
      {!useInstagram && (
        <>
          <div>
            <LocationPicker value={location} onChange={setLocation} />
            {errors.location && (
              <p className="mt-1 text-xs text-destructive">{errors.location}</p>
            )}
          </div>
          <div>
            <TimeSlotPicker value={timeSlot} onChange={setTimeSlot} />
            {errors.timeSlot && (
              <p className="mt-1 text-xs text-destructive">{errors.timeSlot}</p>
            )}
          </div>
        </>
      )}

      {/* サーバーエラー */}
      {serverError && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isSubmitting || items.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-semibold text-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("processing")}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t("confirmReservation")}
          </>
        )}
      </button>
    </form>
  );
}

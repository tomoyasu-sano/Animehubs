"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import {
  FREE_SHIPPING_THRESHOLD_ORE,
  SHIPPING_FEE_ORE,
} from "@/lib/constants";
import type { SwedishAddress } from "@/lib/db/schema";

interface FormErrors {
  email?: string;
  full_name?: string;
  street?: string;
  city?: string;
  postal_code?: string;
}

export default function DeliveryForm() {
  const t = useTranslations("checkout");
  const { data: session } = useSession();
  const { items, totalAmount } = useCart();

  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [address, setAddress] = useState<SwedishAddress>({
    full_name: session?.user?.name ?? "",
    street: "",
    city: "",
    postal_code: "",
    country: "SE",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const needsShipping = totalAmount < FREE_SHIPPING_THRESHOLD_ORE;
  const shippingFee = needsShipping ? SHIPPING_FEE_ORE : 0;
  const grandTotal = totalAmount + shippingFee;

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t("errors.emailInvalid");
    }
    if (!address.full_name.trim() || address.full_name.trim().length < 2) {
      newErrors.full_name = t("errors.nameRequired");
    }
    if (!address.street.trim()) {
      newErrors.street = t("errors.streetRequired");
    }
    if (!address.city.trim()) {
      newErrors.city = t("errors.cityRequired");
    }
    if (!/^\d{3}\s?\d{2}$/.test(address.postal_code)) {
      newErrors.postal_code = t("errors.postalCodeInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          type: "delivery",
          email,
          shippingAddress: address,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        sessionUrl?: string;
      };

      if (!res.ok) {
        if (res.status === 409) {
          setServerError(t("errors.outOfStock"));
        } else {
          setServerError(data.error || t("errors.serverError"));
        }
        return;
      }

      // Stripe Checkout にリダイレクト
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch {
      setServerError(t("errors.serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof SwedishAddress, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 連絡先・住所フォーム */}
      <div className="space-y-4">
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
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder={t("emailPlaceholder")}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
              errors.email ? "border-destructive" : "border-border"
            } bg-background`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        {/* 氏名 */}
        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-foreground"
          >
            {t("name")}
          </label>
          <input
            id="full_name"
            type="text"
            value={address.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            placeholder={t("namePlaceholder")}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
              errors.full_name ? "border-destructive" : "border-border"
            } bg-background`}
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-destructive">{errors.full_name}</p>
          )}
        </div>

        {/* 番地 */}
        <div>
          <label
            htmlFor="street"
            className="block text-sm font-medium text-foreground"
          >
            {t("streetAddress")}
          </label>
          <input
            id="street"
            type="text"
            value={address.street}
            onChange={(e) => updateField("street", e.target.value)}
            placeholder={t("streetPlaceholder")}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
              errors.street ? "border-destructive" : "border-border"
            } bg-background`}
          />
          {errors.street && (
            <p className="mt-1 text-xs text-destructive">{errors.street}</p>
          )}
        </div>

        {/* 市・郵便番号 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="postal_code"
              className="block text-sm font-medium text-foreground"
            >
              {t("postalCode")}
            </label>
            <input
              id="postal_code"
              type="text"
              value={address.postal_code}
              onChange={(e) => updateField("postal_code", e.target.value)}
              placeholder={t("postalCodePlaceholder")}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                errors.postal_code ? "border-destructive" : "border-border"
              } bg-background`}
            />
            {errors.postal_code && (
              <p className="mt-1 text-xs text-destructive">
                {errors.postal_code}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-foreground"
            >
              {t("city")}
            </label>
            <input
              id="city"
              type="text"
              value={address.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder={t("cityPlaceholder")}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                errors.city ? "border-destructive" : "border-border"
              } bg-background`}
            />
            {errors.city && (
              <p className="mt-1 text-xs text-destructive">{errors.city}</p>
            )}
          </div>
        </div>
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{t("subtotal")}</span>
              <span className="text-foreground">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{t("shipping")}</span>
              <span className="text-foreground">
                {shippingFee === 0
                  ? t("shippingFree")
                  : formatPrice(shippingFee)}
              </span>
            </div>
            {needsShipping && (
              <p className="mt-1 text-xs text-muted">
                {t("freeShippingNote")}
              </p>
            )}
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {t("total")}
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(grandTotal)}
              </span>
            </div>
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
        disabled={submitting || items.length === 0}
        className="w-full rounded-lg bg-foreground py-3 text-sm font-semibold text-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t("processing") : t("payWithStripe")}
      </button>
    </form>
  );
}

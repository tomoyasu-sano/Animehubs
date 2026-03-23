"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { PICKUP_LOCATIONS, TIME_SLOTS } from "@/lib/constants";

interface ReservationItem {
  productId: string;
  nameEn: string;
  nameSv: string;
  quantity: number;
  price: number;
}

interface ReservationData {
  id: string;
  customerName: string;
  customerEmail: string;
  location: string;
  timeSlot: string;
  status: string;
  totalAmount: number;
  items: ReservationItem[];
  createdAt: string;
}

export default function ConfirmPage() {
  const t = useTranslations("confirm");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id");
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/animehubs_placeholder";

  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      setError(true);
      return;
    }

    fetch(`/api/reservations/${reservationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setReservation(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [reservationId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted">{t("loading")}</p>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="mb-4 text-lg text-muted">{t("notFound")}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  const shortId = reservation.id.slice(0, 8).toUpperCase();
  const locationName = getLocationName(reservation.location, locale);
  const timeSlotName = getTimeSlotName(reservation.timeSlot, locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 成功アイコン */}
      <div className="mb-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </div>

      {/* 予約番号 */}
      <div className="mb-8 rounded-lg bg-card p-6 text-center border border-border">
        <p className="text-sm text-muted">{t("reservationId")}</p>
        <p className="mt-1 text-2xl font-bold tracking-wider text-foreground font-mono">
          {shortId}
        </p>
      </div>

      {/* 注文内容 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t("orderDetails")}</h2>

        {/* 商品一覧 */}
        <div className="space-y-2 border-b border-border pb-4">
          {reservation.items.map((item) => {
            const name = locale === "sv" ? item.nameSv : item.nameEn;
            return (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {name} x {item.quantity}
                </span>
                <span className="text-foreground">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        {/* 合計 */}
        <div className="mt-4 flex items-center justify-between border-b border-border pb-4">
          <span className="font-semibold text-foreground">{t("total")}</span>
          <span className="text-lg font-bold text-foreground">
            {formatPrice(reservation.totalAmount)}
          </span>
        </div>

        {/* 受け渡し情報 */}
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t("pickupInfo")}</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{t("location")}</span>
            <span className="text-foreground">{locationName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{t("time")}</span>
            <span className="text-foreground">{timeSlotName}</span>
          </div>
        </div>

        {/* メール通知 */}
        <div className="mt-4 rounded-lg bg-background p-3 text-center text-sm text-muted">
          {t("emailSent", { email: reservation.customerEmail })}
        </div>
      </div>

      {/* Instagram リンク */}
      <div className="mt-8 text-center">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          <ExternalLink className="h-4 w-4" />
          {t("contactInstagram")}
        </a>
      </div>

      {/* ホームへ戻る */}
      <div className="mt-4 text-center">
        <Link
          href="/"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}

function getLocationName(locationId: string, locale: string): string {
  if (locationId === "instagram") {
    return "Via Instagram";
  }
  const loc = PICKUP_LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return locationId;
  return locale === "sv" ? loc.name_sv : loc.name_en;
}

function getTimeSlotName(slotId: string, locale: string): string {
  if (slotId === "instagram") {
    return locale === "sv" ? "Kontakta via Instagram" : "Contact via Instagram";
  }
  const slot = TIME_SLOTS.find((s) => s.id === slotId);
  if (!slot) return slotId;
  return locale === "sv" ? slot.name_sv : slot.name_en;
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { PICKUP_LOCATIONS } from "@/lib/constants";

interface LocationPickerProps {
  value: string;
  onChange: (locationId: string) => void;
  disabled?: boolean;
}

export default function LocationPicker({ value, onChange, disabled }: LocationPickerProps) {
  const locale = useLocale();
  const t = useTranslations("checkout");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        <MapPin className="mr-1 inline h-4 w-4" />
        {t("pickupLocation")}
      </label>
      <div className="grid gap-2">
        {PICKUP_LOCATIONS.map((location) => {
          const name = locale === "sv" ? location.name_sv : location.name_en;
          const isSelected = value === location.id;
          return (
            <button
              key={location.id}
              type="button"
              onClick={() => onChange(location.id)}
              disabled={disabled}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                isSelected
                  ? "border-foreground bg-foreground/5 font-medium text-foreground"
                  : "border-border text-muted hover:border-foreground/50 hover:text-foreground"
              } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-[1.02]"}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

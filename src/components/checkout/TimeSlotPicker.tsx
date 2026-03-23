"use client";

import { useLocale, useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { TIME_SLOTS } from "@/lib/constants";

interface TimeSlotPickerProps {
  value: string;
  onChange: (slotId: string) => void;
  disabled?: boolean;
}

export default function TimeSlotPicker({ value, onChange, disabled }: TimeSlotPickerProps) {
  const locale = useLocale();
  const t = useTranslations("checkout");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        <Clock className="mr-1 inline h-4 w-4" />
        {t("timeSlot")}
      </label>
      <div className="grid gap-2">
        {TIME_SLOTS.map((slot) => {
          const name = locale === "sv" ? slot.name_sv : slot.name_en;
          const isSelected = value === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onChange(slot.id)}
              disabled={disabled}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                isSelected
                  ? "border-foreground bg-foreground/5 font-medium text-foreground"
                  : "border-border text-muted hover:border-foreground/50 hover:text-foreground"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

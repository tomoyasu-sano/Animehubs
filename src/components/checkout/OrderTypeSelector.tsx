"use client";

import { useTranslations } from "next-intl";
import { Package, Eye } from "lucide-react";
import type { OrderType } from "@/lib/db/schema";

interface OrderTypeSelectorProps {
  selected: OrderType | null;
  onSelect: (type: OrderType) => void;
}

export default function OrderTypeSelector({
  selected,
  onSelect,
}: OrderTypeSelectorProps) {
  const t = useTranslations("checkout");

  const options: { type: OrderType; icon: typeof Package; labelKey: string; descKey: string }[] = [
    {
      type: "delivery",
      icon: Package,
      labelKey: "delivery",
      descKey: "deliveryDescription",
    },
    {
      type: "inspection",
      icon: Eye,
      labelKey: "inspection",
      descKey: "inspectionDescription",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        {t("orderType")}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map(({ type, icon: Icon, labelKey, descKey }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
              selected === type
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/50"
            }`}
          >
            <Icon
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                selected === type ? "text-foreground" : "text-muted"
              }`}
            />
            <div>
              <p
                className={`text-sm font-medium ${
                  selected === type ? "text-foreground" : "text-foreground"
                }`}
              >
                {t(labelKey)}
              </p>
              <p className="mt-0.5 text-xs text-muted">{t(descKey)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

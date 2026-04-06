"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LayoutGrid, UserRound, KeyRound, Pin, Ellipsis } from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

const CATEGORY_ICONS: Record<string, ComponentType<LucideProps>> = {
  all: LayoutGrid,
  figures: UserRound,
  keychains: KeyRound,
  pins: Pin,
  other: Ellipsis,
};

export default function CategoryFilter() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "";

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const AllIcon = CATEGORY_ICONS.all;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* All */}
      <button
        onClick={() => handleCategoryChange("")}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
          !activeCategory
            ? "bg-foreground text-background"
            : "text-muted hover:text-foreground"
        )}
      >
        <AllIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("common.allCategories")}</span>
      </button>

      {CATEGORIES.filter((c) => c !== "other").map((category) => {
        const Icon = CATEGORY_ICONS[category] || Ellipsis;
        const label =
          CATEGORY_LABELS[category as Category]?.[locale as "en" | "sv"] ||
          category;
        const isActive = activeCategory === category;

        return (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              isActive
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

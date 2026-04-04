"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleCategoryChange("")}
        className={cn(
          "cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all hover:scale-105",
          !activeCategory
            ? "bg-foreground text-background"
            : "border border-border text-muted hover:border-foreground hover:text-foreground"
        )}
      >
        {t("common.allCategories")}
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => handleCategoryChange(category)}
          className={cn(
            "cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all hover:scale-105",
            activeCategory === category
              ? "bg-foreground text-background"
              : "border border-border text-muted hover:border-foreground hover:text-foreground"
          )}
        >
          {CATEGORY_LABELS[category as Category]?.[locale as "en" | "sv"] || category}
        </button>
      ))}
    </div>
  );
}

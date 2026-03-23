"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  isFavorite: boolean;
  onToggle: (productId: string) => void;
  className?: string;
}

export default function FavoriteButton({
  productId,
  isFavorite,
  onToggle,
  className,
}: FavoriteButtonProps) {
  const t = useTranslations("favorites");

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(productId);
      }}
      className={cn(
        "rounded-full p-2 transition-all duration-200",
        isFavorite
          ? "bg-white text-black hover:bg-accent"
          : "bg-black/50 text-white hover:bg-black/70",
        className
      )}
      aria-label={isFavorite ? t("remove") : t("add")}
    >
      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
    </button>
  );
}

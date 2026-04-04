"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  isFavorite: boolean;
  onToggle: (productId: string) => void;
  likesCount?: number;
  className?: string;
}

export default function FavoriteButton({
  productId,
  isFavorite,
  onToggle,
  likesCount,
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
        "cursor-pointer flex items-center gap-1 rounded-full p-2 transition-all duration-200 hover:scale-110",
        isFavorite
          ? "bg-white text-red-500 ring-2 ring-white shadow-md hover:bg-neutral-100"
          : "bg-white/80 text-neutral-600 shadow-sm hover:bg-white hover:text-red-400",
        className
      )}
      aria-label={isFavorite ? t("remove") : t("add")}
    >
      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
      {likesCount != null && likesCount > 0 && (
        <span className="text-xs font-medium">{likesCount}</span>
      )}
    </button>
  );
}

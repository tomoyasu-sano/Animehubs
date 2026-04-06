"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function ProductSearch() {
  const t = useTranslations("products");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const initialQuery = useMemo(() => searchParams.get("q") || "", [searchParams]);
  const [query, setQuery] = useState(initialQuery);
  const [expanded, setExpanded] = useState(!!initialQuery);

  // URL の q パラメータが外部から変わったら同期
  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    setQuery(currentQ);
    if (!currentQ) setExpanded(false);
  }, [searchParams]);

  const updateSearch = useCallback(
    (value: string) => {
      setQuery(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      const queryString = params.toString();
      router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  const handleOpen = () => {
    setExpanded(true);
    // 次フレームでフォーカス
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleClose = () => {
    if (query) {
      updateSearch("");
    }
    setExpanded(false);
  };

  return (
    <div className="relative flex items-center">
      {/* 閉じている状態: アイコンボタンのみ */}
      {!expanded && (
        <button
          onClick={handleOpen}
          className="cursor-pointer rounded-full p-2 text-muted transition-colors hover:text-foreground"
          aria-label={t("searchPlaceholder")}
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {/* 展開状態: 入力欄 */}
      {expanded && (
        <div className="flex w-full items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-full p-2 text-muted transition-colors hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

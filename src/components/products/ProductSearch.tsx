"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export default function ProductSearch() {
  const t = useTranslations("products");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // searchParams から初期値を派生（useEffect不要）
  const initialQuery = useMemo(() => searchParams.get("q") || "", [searchParams]);
  const [query, setQuery] = useState(initialQuery);

  // searchParams が変わったら query を同期（useEffect を使わずキーで再マウント）
  // ただし入力中はローカル状態を優先するため、単方向で管理
  const handleSearch = useCallback(
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

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}

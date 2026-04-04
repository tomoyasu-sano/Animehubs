"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";

export default function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleSwitch = () => {
    const newLocale = locale === "en" ? "sv" : "en";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={handleSwitch}
      className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted transition-all hover:scale-105 hover:text-white"
      aria-label={t("language")}
    >
      <Globe className="h-4 w-4" />
      <span className="uppercase">{locale === "en" ? "SV" : "EN"}</span>
    </button>
  );
}

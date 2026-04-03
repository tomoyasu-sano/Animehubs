"use client";

import { useTranslations } from "next-intl";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-white">500</h1>
      <p className="mt-2 text-muted">{t("error")}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}

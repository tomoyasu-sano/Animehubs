"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";

type UnsubscribeState = "loading" | "success" | "expired" | "invalid";

export default function UnsubscribePage() {
  const t = useTranslations("unsubscribe");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<UnsubscribeState>(
    token ? "loading" : "invalid",
  );

  useEffect(() => {
    if (!token) return;

    fetch(`/api/newsletter/unsubscribe?token=${token}`)
      .then(async (res) => {
        if (res.ok) {
          setState("success");
        } else {
          const data = (await res.json()) as { reason?: string };
          setState(data.reason === "expired" ? "expired" : "invalid");
        }
      })
      .catch(() => {
        setState("invalid");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
        {state === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4" />
            <p className="text-neutral-600">{t("loading")}</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              {t("successTitle")}
            </h1>
            <p className="text-neutral-600 mb-6">{t("successMessage")}</p>
          </>
        )}

        {state === "expired" && (
          <>
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              {t("expiredTitle")}
            </h1>
            <p className="text-neutral-600 mb-6">{t("expiredMessage")}</p>
          </>
        )}

        {state === "invalid" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              {t("invalidTitle")}
            </h1>
            <p className="text-neutral-600 mb-6">{t("invalidMessage")}</p>
          </>
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}

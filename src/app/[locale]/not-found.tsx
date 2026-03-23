import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-white">404</h1>
      <p className="mt-2 text-muted">{t("notFound")}</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent"
      >
        {t("backToHome")}
      </Link>
    </div>
  );
}

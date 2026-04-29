import { getTranslations } from "next-intl/server";
import { getRecommendedProducts } from "@/lib/db/queries";
import RecommendedProductsGrid from "./RecommendedProductsGrid";

interface RecommendedProductsProps {
  productId: string;
  category: string;
}

export default async function RecommendedProducts({ productId, category }: RecommendedProductsProps) {
  const t = await getTranslations("products");
  const products = await getRecommendedProducts(productId, category);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border pt-12 mt-12">
      <h2 className="mb-6 text-lg font-semibold text-foreground">
        {t("recommendedTitle")}
      </h2>
      <RecommendedProductsGrid products={products} />
    </section>
  );
}

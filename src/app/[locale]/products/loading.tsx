import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-4 w-24" />
      </div>

      <div className="mb-8 space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <ProductGridSkeleton />
    </div>
  );
}

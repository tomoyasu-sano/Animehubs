import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div>
      {/* ヒーロースケルトン */}
      <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-800 to-background">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <Skeleton className="mx-auto h-12 w-3/4" />
          <Skeleton className="mx-auto mt-6 h-6 w-2/3" />
          <Skeleton className="mx-auto mt-10 h-12 w-48 rounded-full" />
        </div>
      </div>

      {/* 商品グリッドスケルトン */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-8 w-48" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

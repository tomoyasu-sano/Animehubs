import { Skeleton } from "@/components/ui/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24 lg:px-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecommendedSkeleton() {
  return (
    <div className="border-t border-border pt-12 mt-12">
      <div className="mb-6 h-7 w-48 animate-pulse rounded bg-muted/30" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square animate-pulse rounded-lg bg-muted/30" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

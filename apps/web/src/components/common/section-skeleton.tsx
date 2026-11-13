import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex items-end gap-1.5 px-1" style={{ height }} aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
      ))}
    </div>
  );
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

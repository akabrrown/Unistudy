import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-5 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-1">
          <Skeleton className="lg:col-span-5 h-40 rounded-2xl" />
          <Skeleton className="lg:col-span-7 h-40 rounded-2xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="lg:col-span-4 space-y-5">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

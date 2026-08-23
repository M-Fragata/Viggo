export function MasterCompaniesSkeleton() {
  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-64 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="h-5 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
      </div>

      {/* Filters Bar Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
        <div className="h-10 w-36 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
        <div className="h-10 w-36 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-[#111113] rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="h-5 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl shimmer"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

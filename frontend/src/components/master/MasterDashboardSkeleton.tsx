export function MasterDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-14 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-9 w-14 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-9 w-14 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#111113] p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            </div>
            <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          <div className="h-64 bg-slate-50 dark:bg-white/5 rounded-2xl shimmer" />
        </div>
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          <div className="h-64 bg-slate-50 dark:bg-white/5 rounded-2xl shimmer" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="h-10 w-44 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
      </div>

      {/* Metric Cards Grid */}
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
            <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-3 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Main Content: Progress & Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Status & Alertas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="h-5 w-40 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl shimmer" />
              <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl shimmer" />
              <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl shimmer" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl shimmer"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 3: Links Rápidos */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl shimmer"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

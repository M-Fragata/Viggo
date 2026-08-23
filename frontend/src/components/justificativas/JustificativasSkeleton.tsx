export function JustificativasSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-60 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="h-10 w-40 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 shimmer" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-5 w-10 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="h-12 bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-3 flex gap-2">
        <div className="h-full w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
        <div className="h-full w-24 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
        <div className="h-full w-24 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
        <div className="h-full w-24 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
      </div>

      {/* List Section Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border border-slate-100 dark:border-white/10 rounded-2xl p-4 space-y-3 bg-slate-50/30 dark:bg-white/[0.01]"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-24 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
              </div>
              <div className="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

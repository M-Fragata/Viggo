export function PlanoSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
      </div>

      {/* Payment Status Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-4 w-52 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          </div>
          <div className="h-11 w-36 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>

      {/* Details & Usage Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="h-6 w-44 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        <div className="h-5 w-full bg-slate-100 dark:bg-white/5 rounded-full shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="h-16 bg-slate-50 dark:bg-white/5 rounded-2xl shimmer" />
          <div className="h-16 bg-slate-50 dark:bg-white/5 rounded-2xl shimmer" />
          <div className="h-16 bg-slate-50 dark:bg-white/5 rounded-2xl shimmer" />
        </div>
      </div>

      {/* History Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="h-6 w-52 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 dark:bg-white/5 rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

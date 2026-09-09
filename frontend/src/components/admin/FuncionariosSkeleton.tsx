export function FuncionariosSkeleton() {
  return (
    <div className="w-full space-y-6 min-w-0">
      {/* Header Skeleton */}
      <header className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:items-center bg-white dark:bg-[#111113] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
        <div className="space-y-2">
          <div className="h-7 w-48 max-w-full bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-80 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
        </div>
      </header>

      {/* Filter / Search Bar Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
        <div className="h-10 w-32 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
      </div>

      {/* Employee List Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 shimmer shrink-0" />
              <div className="space-y-2 min-w-0">
                <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                <div className="h-3 w-56 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
              <div className="h-8 w-8 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

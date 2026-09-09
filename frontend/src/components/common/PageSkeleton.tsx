export function PageSkeleton() {
  return (
    <div className="w-full space-y-6 min-w-0">
      {/* Header Skeleton */}
      <header className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:items-center bg-white dark:bg-[#111113] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
        <div className="space-y-2">
          <div className="h-7 w-56 max-w-full bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-72 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="h-10 w-36 max-w-full bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
      </header>

      {/* Main Content Card Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>

        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-2.5 bg-slate-50/50 dark:bg-white/[0.02]"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
              </div>
              <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

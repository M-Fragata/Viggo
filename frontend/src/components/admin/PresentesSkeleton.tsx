export function PresentesSkeleton() {
  return (
    <div className="w-full space-y-6 min-w-0">
      {/* Header Skeleton */}
      <header className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:items-center bg-white dark:bg-[#111113] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
        <div className="space-y-2">
          <div className="h-7 w-52 max-w-full bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-72 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
      </header>

      {/* Main Card with Date Picker & Table Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          <div className="h-10 w-40 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>

        {/* Table rows skeleton */}
        <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="h-4 w-44 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                <div className="h-3 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-md shimmer" />
                <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-md shimmer" />
                <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-md shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

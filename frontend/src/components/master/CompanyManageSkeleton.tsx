export function CompanyManageSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Button Skeleton */}
      <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />

      {/* Header Card Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
            <div className="h-7 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-3">
          <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-3">
          <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
      </div>

      {/* Actions Card */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-28 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-10 w-28 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-10 w-28 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>
    </div>
  );
}

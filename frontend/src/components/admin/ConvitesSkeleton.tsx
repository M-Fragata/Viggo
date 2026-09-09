export function ConvitesSkeleton() {
  return (
    <div className="w-full space-y-6 min-w-0">
      {/* Header Skeleton */}
      <header className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:items-center bg-white dark:bg-[#111113] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
        <div className="space-y-2">
          <div className="h-7 w-60 max-w-full bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-96 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
      </header>

      {/* Tab Switcher Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-xs flex flex-col sm:flex-row gap-1.5">
        <div className="h-10 flex-1 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        <div className="h-10 flex-1 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
        <div className="h-10 flex-1 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
      </div>

      {/* Main Tab Content Card Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
        <div className="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-2xl shimmer" />
        <div className="h-44 w-full bg-slate-100 dark:bg-white/5 rounded-2xl shimmer" />
      </div>
    </div>
  );
}

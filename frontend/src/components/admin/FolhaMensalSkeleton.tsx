export function FolhaMensalSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
      </div>

      {/* 3 Sections Skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-5"
        >
          <div className="space-y-2">
            <div className="h-6 w-60 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-4 w-80 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="h-11 w-32 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
            <div className="h-11 w-32 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
            <div className="h-11 w-40 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

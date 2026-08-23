export function HorariosSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.02]"
        >
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="h-4 w-72 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-3 w-60 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-9 w-20 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PontoViewPageSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Header Skeleton (1:1 com PageHeader) */}
      <header className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:items-center bg-white dark:bg-[#111113] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="h-10 w-44 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
      </header>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timeline Column */}
        <div className="md:col-span-2 bg-white dark:bg-[#111113] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 transition-colors">
          <div className="h-6 w-44 bg-slate-200 dark:bg-white/10 rounded-lg mb-8 shimmer" />
          <div className="relative border-l-2 border-slate-200 dark:border-white/10 ml-4 pl-8 space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-2 border-emerald-600 dark:border-emerald-400 bg-white dark:bg-[#111113]" />
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
                    <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                  </div>
                  <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-12 w-full bg-slate-200 dark:bg-white/10 rounded-xl mt-10 shimmer" />
        </div>

        {/* Right Column: Resumo / Status */}
        <div className="flex flex-col gap-6">
          <div className="bg-emerald-600 dark:bg-emerald-600/90 p-6 rounded-3xl text-white shadow-md shadow-emerald-900/10 space-y-3">
            <div className="h-4 w-28 bg-white/20 rounded shimmer" />
            <div className="h-9 w-24 bg-white/30 rounded-xl shimmer" />
            <div className="h-3 w-48 bg-white/20 rounded mt-4 pt-4 shimmer" />
          </div>

          <div className="bg-white dark:bg-[#111113] p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3 transition-colors">
            <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-6 w-24 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

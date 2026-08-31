export function CompanyManageSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />

      {/* Header Card Skeleton */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
            <div className="space-y-2">
              <div className="h-7 w-52 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
              <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
            <div className="h-7 w-20 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          </div>
        </div>
      </div>

      {/* 4 Info Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-2.5"
          >
            <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Health Score Detalhado */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-5 w-56 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-3 w-80 max-w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-2"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                <div className="h-3 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              </div>
              <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Histórico Financeiro & Faturas */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="h-5 w-60 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-full bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
          <div className="h-10 w-full bg-slate-50 dark:bg-white/[0.02] rounded-xl shimmer" />
          <div className="h-10 w-full bg-slate-50 dark:bg-white/[0.02] rounded-xl shimmer" />
        </div>
      </div>

      {/* Funcionários */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/[0.02] border border-transparent dark:border-white/5 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                  <div className="h-3 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                </div>
              </div>
              <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-6">
        <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />

        {/* Status */}
        <div className="space-y-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="flex flex-wrap gap-2">
            <div className="h-9 w-24 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-9 w-28 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-9 w-24 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          </div>
        </div>

        {/* Plano */}
        <div className="space-y-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="flex flex-wrap gap-2">
            <div className="h-9 w-24 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-9 w-28 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          </div>
        </div>

        {/* Botão Impersonar */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/10">
          <div className="h-12 w-52 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>
    </div>
  );
}

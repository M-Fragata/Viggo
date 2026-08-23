export function MeusDadosSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="h-10 w-44 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
      </div>

      {/* Section 1: Dados Pessoais */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-6 w-36 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Dados Biométricos */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-6 w-44 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        </div>
        <div className="h-16 bg-slate-50 dark:bg-white/5 rounded-2xl shimmer" />
      </div>

      {/* Section 3: Registros de Ponto */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          </div>
          <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 dark:bg-white/5 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

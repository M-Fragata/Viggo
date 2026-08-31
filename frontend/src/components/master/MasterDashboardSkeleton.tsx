export function MasterDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-8 w-60 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-96 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-14 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-9 w-14 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-9 w-14 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>

      {/* Seção 1: Aquisição & Conversão */}
      <div className="space-y-3">
        <div className="h-6 w-64 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-white/[0.04] p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
              </div>
              <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
              <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Seção 2: Alertas de Risco & CS Proativo */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="w-9 h-9 bg-slate-200 dark:bg-white/10 rounded-xl shimmer shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-5 w-64 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-3 w-96 max-w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        </div>

        {/* Abas */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-36 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
          ))}
        </div>

        {/* Linhas de Alerta */}
        <div className="border border-slate-100 dark:border-white/10 rounded-2xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                <div className="h-3 w-64 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              </div>
              <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-lg shimmer shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Seção 3: Funil de Conversão */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="h-3 w-64 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-32 h-4 bg-slate-200 dark:bg-white/10 rounded shimmer shrink-0" />
              <div className="flex-1 h-8 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shimmer" />
              <div className="w-16 h-4 bg-slate-200 dark:bg-white/10 rounded shimmer shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Seção 4: Gráfico Linha Dupla */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="h-5 w-56 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        <div className="h-[280px] w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl shimmer" />
      </div>

      {/* Seção 5: Top Origens */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="h-5 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        <div className="space-y-2">
          <div className="h-8 w-full bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
          <div className="h-10 w-full bg-slate-50 dark:bg-white/[0.02] rounded-xl shimmer" />
          <div className="h-10 w-full bg-slate-50 dark:bg-white/[0.02] rounded-xl shimmer" />
          <div className="h-10 w-full bg-slate-50 dark:bg-white/[0.02] rounded-xl shimmer" />
        </div>
      </div>

      {/* Seção 6: Métricas Gerais (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-white/[0.04] p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            </div>
            <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-3 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Seção 7: Distribuição por Plano + Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="space-y-3 pt-2">
            <div className="h-8 w-full bg-slate-50 dark:bg-white/5 rounded-xl shimmer" />
            <div className="h-8 w-full bg-slate-50 dark:bg-white/5 rounded-xl shimmer" />
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="h-28 bg-slate-50 dark:bg-white/5 rounded-xl shimmer" />
            <div className="h-28 bg-slate-50 dark:bg-white/5 rounded-xl shimmer" />
          </div>
        </div>
      </div>

      {/* Seção 8: Ações Rápidas */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="h-5 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        <div className="flex flex-wrap gap-3">
          <div className="h-9 w-44 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-9 w-52 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>
    </div>
  );
}

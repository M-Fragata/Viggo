export function MeusEspelhosSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-96 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="h-10 w-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
      </div>

      {/* Seletor de Meses Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-xl shimmer"
            />
          ))}
        </div>
      </div>

      {/* Banner de Status & Ações */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 shimmer" />
            <div className="h-6 w-56 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          </div>
          <div className="h-4 w-80 max-w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-32 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-10 w-36 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-2"
          >
            <div className="h-3 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-7 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          </div>
        ))}
      </div>

      {/* Tabela do Espelho Diário */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="h-5 w-44 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-3 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="py-3 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="py-3 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="py-3 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="py-3 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="py-3 px-4"><div className="h-4 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3.5 px-4"><div className="h-4 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

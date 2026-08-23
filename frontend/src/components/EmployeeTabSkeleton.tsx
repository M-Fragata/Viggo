export function EmployeeTabSkeleton() {
  return (
    <div className="w-full space-y-6 min-w-0">
      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 shimmer shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-5 w-10 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card Skeleton */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-4 sm:p-6 space-y-5 w-full overflow-hidden min-w-0">
        {/* Filters Bar Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-100 dark:border-white/5">
          <div className="h-10 w-full sm:w-72 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-10 w-36 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
            <div className="h-10 w-36 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
          </div>
        </div>

        {/* Mobile View Skeleton */}
        <div className="sm:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden p-4 bg-slate-50/50 dark:bg-white/[0.02] space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 shimmer shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                    <div className="h-3 w-40 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/5">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Colaborador</th>
                <th className="p-4">Cargo</th>
                <th className="p-4">Escala de Trabalho</th>
                <th className="p-4 text-center">Registros</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 shimmer shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                        <div className="h-3 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
                  </td>
                  <td className="p-4 text-center">
                    <div className="h-6 w-12 bg-slate-200 dark:bg-white/10 rounded-full shimmer mx-auto" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded-xl shimmer ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

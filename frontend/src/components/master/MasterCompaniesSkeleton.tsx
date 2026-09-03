export function MasterCompaniesSkeleton() {
  return (
    <div className="w-full space-y-6 min-w-0">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <div className="h-8 w-36 max-w-full bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          <div className="h-4 w-72 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
        </div>
        <div className="flex gap-3 items-center">
          <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="h-9 w-32 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        </div>
      </div>

      {/* Filters Bar Skeleton */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-11 flex-1 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="h-11 w-full sm:w-40 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
            <div className="h-11 w-full sm:w-40 bg-slate-100 dark:bg-white/5 rounded-xl shimmer" />
          </div>
        </div>
      </div>

      {/* Mobile Skeleton View */}
      <div className="sm:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                  <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                </div>
              </div>
              <div className="h-6 w-14 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden sm:block bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                <th className="p-4 w-12"><div className="h-4 w-4 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[20%]"><div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[12%]"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[8%]"><div className="h-4 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[10%]"><div className="h-4 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[10%]"><div className="h-4 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[12%]"><div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[10%]"><div className="h-4 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[10%]"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" /></th>
                <th className="p-4 w-[8%] text-right"><div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-14 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-14 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-12 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full shimmer max-w-[70px]" />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-lg shimmer ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

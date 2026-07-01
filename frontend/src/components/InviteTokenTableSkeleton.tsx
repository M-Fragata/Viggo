export function InviteTokenTableSkeleton() {
  return (
    <div>
      <div className="sm:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-7 w-28 bg-slate-200 rounded shimmer" />
                <div className="h-6 w-16 bg-slate-200 rounded-full shimmer" />
              </div>
              <div className="h-5 w-5 bg-slate-200 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-sm font-medium text-slate-500">
              <th className="pb-3 px-2">Token</th>
              <th className="pb-3 px-2">Criado em</th>
              <th className="pb-3 px-2">Expira em</th>
              <th className="pb-3 px-2">Usos</th>
              <th className="pb-3 px-2">Status</th>
              <th className="pb-3 px-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="py-4 px-2">
                  <div className="h-7 w-28 bg-slate-200 rounded shimmer" />
                </td>
                <td className="py-4 px-2">
                  <div className="h-4 w-16 bg-slate-200 rounded shimmer" />
                </td>
                <td className="py-4 px-2">
                  <div className="h-4 w-16 bg-slate-200 rounded shimmer" />
                </td>
                <td className="py-4 px-2">
                  <div className="h-4 w-12 bg-slate-200 rounded shimmer" />
                </td>
                <td className="py-4 px-2">
                  <div className="h-6 w-16 bg-slate-200 rounded-full shimmer" />
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <div className="h-8 w-8 bg-slate-200 rounded-lg shimmer" />
                    <div className="h-8 w-8 bg-slate-200 rounded-lg shimmer" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

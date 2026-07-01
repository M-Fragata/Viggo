export function EmployeeTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="h-5 w-48 bg-slate-200 rounded shimmer" />
          <div className="h-4 w-40 bg-slate-200 rounded shimmer" />
        </div>

        <div className="sm:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden p-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-36 bg-slate-200 rounded shimmer" />
                <div className="h-5 w-5 bg-slate-200 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-[35%] min-w-[180px]">Nome</th>
                <th className="p-4 w-[35%] min-w-[180px]">E-mail</th>
                <th className="p-4 w-[15%] min-w-[120px]">Cargo</th>
                <th className="p-4 w-[15%] min-w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="p-4">
                    <div className="h-4 w-36 bg-slate-200 rounded shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-48 bg-slate-200 rounded shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-20 bg-slate-200 rounded-full shimmer" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-16 bg-slate-200 rounded-full shimmer" />
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

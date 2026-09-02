export function PolosTrabalhoSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-4"
        >
          {/* Topo: Ícone, Nome e Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 shimmer" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
                <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              </div>
            </div>
            <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
          </div>

          {/* Endereço */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
            <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>

          {/* Coordenadas e Raio */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="h-2.5 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
            <div className="space-y-1">
              <div className="h-2.5 w-14 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-3.5 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConfiguracoesSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-60 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
        <div className="h-4 w-96 max-w-full bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
      </div>

      {/* Seção 1: Validação Facial */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 shimmer" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="h-3.5 w-72 max-w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 shimmer" />
                <div className="h-5 w-20 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
              </div>
              <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-3 w-4/5 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Seção 2: Modo Totem */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 shimmer" />
          <div className="space-y-1.5">
            <div className="h-5 w-44 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
            <div className="h-3.5 w-64 max-w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 shimmer" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Botão de Salvar */}
      <div className="flex justify-end pt-2">
        <div className="h-11 w-44 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
      </div>
    </div>
  );
}

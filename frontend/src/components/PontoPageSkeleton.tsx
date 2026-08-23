export function PontoPageSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6 w-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <section
          key={i}
          className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 shadow-sm"
        >
          <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-full shimmer" />
          <div className="text-center w-full space-y-2">
            <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded mx-auto shimmer" />
            <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded mx-auto shimmer" />
          </div>
          <div className="w-full h-12 bg-slate-200 dark:bg-white/10 rounded-2xl shimmer" />
        </section>
      ))}
    </div>
  );
}
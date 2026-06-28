export function PontoPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <section key={i} className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6">
            <div className="w-12 h-12 bg-slate-200 rounded-full shimmer" />
            <div className="text-center w-full">
              <div className="h-6 w-32 bg-slate-200 rounded mx-auto shimmer" />
              <div className="h-4 w-40 bg-slate-200 rounded mx-auto mt-2 shimmer" />
            </div>
            <div className="w-full h-12 bg-slate-200 rounded-2xl shimmer" />
          </section>
        ))}
      </div>
    </div>
  );
}
export function PontoViewPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 md:my-0 my-4">
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="h-7 w-48 bg-slate-200 rounded shimmer" />
          <div className="h-4 w-64 bg-slate-200 rounded mt-2 shimmer" />
        </div>
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border w-full md:w-auto">
          <div className="h-5 w-5 bg-slate-200 rounded shimmer" />
          <div className="h-5 w-36 bg-slate-200 rounded shimmer" />
        </div>
      </section>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="h-5 w-40 bg-slate-200 rounded mb-6 shimmer" />
          <div className="relative border-l-2 border-blue-100 ml-4 pl-8 space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-2 border-slate-200 bg-white shimmer" />
                <div className="flex justify-between items-start">
                  <div>
                    <div className="h-6 w-20 bg-slate-200 rounded shimmer" />
                    <div className="h-4 w-28 bg-slate-200 rounded mt-2 shimmer" />
                  </div>
                  <div className="h-4 w-16 bg-slate-200 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-10 w-full bg-slate-200 rounded-lg mt-10 shimmer" />
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-emerald-100 p-6 rounded-xl">
            <div className="h-4 w-28 bg-emerald-200 rounded shimmer" />
            <div className="h-8 w-24 bg-emerald-200 rounded mt-2 shimmer" />
            <div className="h-3 w-48 bg-emerald-200 rounded mt-4 pt-4 shimmer" />
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="h-4 w-28 bg-slate-200 rounded mb-3 shimmer" />
            <div className="h-6 w-20 bg-slate-200 rounded shimmer" />
          </div>
        </div>
      </main>
    </div>
  );
}

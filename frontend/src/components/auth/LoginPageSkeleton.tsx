export function LoginPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[160px] pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Logo & Title Skeleton */}
          <div className="space-y-3 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10 shimmer" />
            <div className="h-7 w-48 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-white/10 rounded-lg shimmer" />
          </div>

          {/* Form Fields Skeleton */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-11 w-full bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5 shimmer" />
            </div>

            <div className="space-y-1.5">
              <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-11 w-full bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5 shimmer" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>

            {/* Submit Button Skeleton */}
            <div className="h-12 w-full bg-emerald-500/30 rounded-xl shimmer mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

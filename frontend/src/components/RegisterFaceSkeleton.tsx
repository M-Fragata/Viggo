export function RegisterFaceSkeleton() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-center items-center h-[80vh] max-h-[700px]">
        {/* Top Message Banner Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-[100] bg-slate-800 border-b border-white/10 w-full p-3 h-[60px] flex items-center justify-center">
          <div className="h-5 w-48 bg-white/20 rounded-lg shimmer" />
        </div>

        {/* Video Area Placeholder with Shimmer */}
        <div className="w-full h-full bg-slate-950 flex items-center justify-center relative">
          <div className="w-16 h-16 rounded-full bg-white/5 shimmer" />

          {/* Oval face guide overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className="md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-white/20 animate-pulse"
              style={{ borderRadius: "50% / 40%" }}
            />
          </div>
        </div>

        {/* Bottom indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <div className="h-4 w-44 bg-white/15 rounded-full shimmer" />
        </div>
      </div>
    </div>
  );
}

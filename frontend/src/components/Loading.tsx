interface LoadingProps {
  fullScreen?: boolean;
  mensagem?: string;
}

export function Loading({ fullScreen = false, mensagem }: LoadingProps = {}) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={`w-full flex flex-col items-center justify-center bg-transparent transition-colors ${
        fullScreen ? "min-h-screen" : "flex-1 min-h-[50vh] py-12"
      }`}
    >
      <div className="animate-spin rounded-full h-10 w-10 border-3 border-emerald-200 dark:border-emerald-950/60 border-t-emerald-500 dark:border-t-emerald-400" />
      {mensagem && (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse">
          {mensagem}
        </p>
      )}
      <span className="sr-only">Carregando conteúdo...</span>
    </div>
  );
}
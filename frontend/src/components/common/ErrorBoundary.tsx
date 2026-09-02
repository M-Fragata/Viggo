import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  temErro: boolean;
  erro: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    temErro: false,
    erro: null,
  };

  public static getDerivedStateFromError(erro: Error): ErrorBoundaryState {
    return { temErro: true, erro };
  }

  public override componentDidCatch(erro: Error, infoErro: ErrorInfo): void {
    console.error("[Viggo] Erro interceptado pelo ErrorBoundary:", erro, infoErro);
  }

  private handleTentarNovamente = (): void => {
    this.setState({ temErro: false, erro: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleIrParaInicio = (): void => {
    this.setState({ temErro: false, erro: null });
    window.location.href = "/";
  };

  public override render(): ReactNode {
    if (this.state.temErro) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const mensagemErro = this.state.erro?.message?.toLowerCase() || "";
      const isFalhaModulo =
        mensagemErro.includes("dynamically imported module") ||
        mensagemErro.includes("failed to fetch") ||
        mensagemErro.includes("loading chunk") ||
        mensagemErro.includes("networkerror");

      return (
        <div className="min-h-[50vh] flex-1 w-full flex items-center justify-center p-4 sm:p-6 transition-colors">
          <div className="w-full max-w-md bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Ícone Informativo */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-500 flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>

            {/* Texto Explicativo */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                {isFalhaModulo ? "Instabilidade Temporária de Conexão" : "Ocorreu um erro inesperado"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {isFalhaModulo
                  ? "Não foi possível carregar os arquivos desta tela devido a uma oscilação na rede ou atualização recente da plataforma."
                  : "Houve um problema ao renderizar este módulo. Recarregue a página para continuar utilizando normalmente."}
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleTentarNovamente}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/30 active:scale-[0.98]"
              >
                <RefreshCw size={16} />
                Recarregar Página
              </button>

              <button
                type="button"
                onClick={this.handleIrParaInicio}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home size={16} />
                Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

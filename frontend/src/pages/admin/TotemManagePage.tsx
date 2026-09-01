import { useState } from "react";
import { useNavigate } from "react-router";
import {
  TabletSmartphone,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Info,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/common/PageHeader";

export function TotemManagePage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveTotem, setHasActiveTotem] = useState(() => {
    const token = localStorage.getItem("@viggo:totem");
    const expiresAt = localStorage.getItem("@viggo:totem:expiresAt");
    return Boolean(token && (!expiresAt || Number(expiresAt) > Date.now()));
  });

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4,6}$/.test(pin)) {
      setError("O PIN deve conter de 4 a 6 dígitos numéricos.");
      return;
    }

    if (pin !== confirmPin) {
      setError("Os PINs informados não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.totem.activate(pin);
      localStorage.setItem("@viggo:totem", result.totemToken);
      localStorage.setItem("@viggo:totem:expiresAt", String(Date.now() + result.expiresIn * 1000));
      setPin("");
      setConfirmPin("");
      navigate("/totem-app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar o modo totem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = () => {
    localStorage.removeItem("@viggo:totem");
    localStorage.removeItem("@viggo:totem:expiresAt");
    setHasActiveTotem(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Terminal Totem"
        subtitle="Configuração e ativação do terminal fixo de autoatendimento"
        helpText="O Modo Totem transforma qualquer tablet, celular ou computador da recepção em um relógio de ponto compartilhado protegido por PIN."
      />

      {/* Status da Sessão Ativa */}
      {hasActiveTotem && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
                Sessão de Totem Ativa neste Dispositivo
              </h3>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                O token de segurança está autenticado. Você pode reabrir a tela do totem ou encerrar a sessão.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate("/totem-app")}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              Abrir Terminal
              <ArrowRight size={16} />
            </button>
            <button
              onClick={handleDeactivate}
              className="px-4 py-2.5 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-semibold rounded-xl transition-colors text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={16} />
              Encerrar
            </button>
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Ativação (2 Colunas) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TabletSmartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {hasActiveTotem ? "Renovar / Alterar PIN do Totem" : "Ativar Novo Terminal"}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400">
                Defina uma senha numérica temporária para travar a saída do quiosque
              </p>
            </div>
          </div>

          <form onSubmit={handleActivate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  PIN de Saída (4 a 6 dígitos)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white text-center text-xl tracking-[0.4em] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Confirmar PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white text-center text-xl tracking-[0.4em] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 text-xs sm:text-sm rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !pin || !confirmPin}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Ativando Terminal...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Iniciar Modo Totem Agora
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card Informativo / Guia de Boas Práticas (1 Coluna) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4 transition-colors">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Como Funciona o Totem
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <p>O dispositivo entra em tela cheia com interface simplificada para os funcionários.</p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <p>O colaborador escolhe o tipo de registro (Entrada, Almoço ou Saída) e valida via câmera facial.</p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </div>
                <p>O comprovante digital assinado é gerado na hora e sincronizado instantaneamente com o painel.</p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  4
                </div>
                <p>Para fechar o totem, clique no ícone de saída no topo e digite o PIN configurado.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
              <Info size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Esqueceu o PIN? Use a recuperação com email e senha do admin.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useCompany } from "../../hooks/useCompany";
import { useToast } from "../../hooks/useToast";
import {
  FacialValidationMode,
  TotemAuthMode,
  type CompanySettings,
} from "../../services/api";
import {
  ScanFace,
  ShieldCheck,
  ShieldAlert,
  TabletSmartphone,
  Save,
  CheckCircle2,
  Loader2,
  Lock,
  Clock,
} from "lucide-react";

export function ConfiguracoesPage() {
  const { company, isLoading, updateCompany } = useCompany();
  const { toast } = useToast();

  const [facialMode, setFacialMode] = useState<FacialValidationMode>("FRONTAL_ONLY");
  const [totemMode, setTotemMode] = useState<TotemAuthMode>("FRONTAL_ONLY");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company?.settings) {
      const currentSettings = company.settings as CompanySettings;
      if (currentSettings.ponto?.facialMode) {
        setFacialMode(currentSettings.ponto.facialMode);
      }
      if (currentSettings.totem?.authMode) {
        setTotemMode(currentSettings.totem.authMode);
      }
    }
  }, [company]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCompany({
        settings: {
          ponto: {
            facialMode,
          },
          totem: {
            authMode: totemMode,
          },
        },
      });

      toast.success("Configurações atualizadas!", {
        description: "As novas regras de validação facial e totem já estão ativas.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={32} />
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Configurações do Ponto & Totem"
        subtitle="Personalize as regras de validação facial e a forma de registro dos colaboradores"
        helpText="Defina o nível de exigência biométrica nos registros individuais e configure o comportamento dos terminais Totem coletivos."
      />

      {/* SEÇÃO 1: PONTO INDIVIDUAL (WEB & MOBILE) */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ScanFace size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Validação Facial no Ponto Individual
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aplica-se ao registro de ponto web pelo navegador e no aplicativo mobile dos funcionários.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opção 1: FRONTAL_ONLY */}
          <div
            onClick={() => setFacialMode("FRONTAL_ONLY")}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
              facialMode === "FRONTAL_ONLY"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#161618]"
            }`}
          >
            {facialMode === "FRONTAL_ONLY" && (
              <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                  Padrão • Mais Rápido
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Facial Apenas Frontal
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                O colaborador posiciona o rosto centralizado na câmera e valida a foto diretamente, sem exigir rotação da cabeça para os lados.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock size={14} className="text-emerald-500" />
              <span>Tempo de batida: ~1 a 2 segundos</span>
            </div>
          </div>

          {/* Opção 2: FULL_LIVENESS */}
          <div
            onClick={() => setFacialMode("FULL_LIVENESS")}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
              facialMode === "FULL_LIVENESS"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#161618]"
            }`}
          >
            {facialMode === "FULL_LIVENESS" && (
              <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                  Máxima Segurança
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Prova de Vida Completa (Liveness)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Desafio dinâmico que exige olhar para a frente e virar o rosto para a esquerda e direita, garantindo presença física do funcionário.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck size={14} className="text-blue-500" />
              <span>Anti-fraude avançado com validação 3D</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: MODO TOTEM EMPRESARIAL */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <TabletSmartphone size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Autenticação no Modo Totem
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define como os colaboradores batem ponto nos tablets ou terminais fixos da empresa.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Totem Opção 1: FRONTAL_ONLY */}
          <div
            onClick={() => setTotemMode("FRONTAL_ONLY")}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
              totemMode === "FRONTAL_ONLY"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#161618]"
            }`}
          >
            {totemMode === "FRONTAL_ONLY" && (
              <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                  Padrão
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Login + Facial Frontal
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                O funcionário digita suas credenciais e confirma com uma foto frontal rápida no totem.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ScanFace size={14} className="text-emerald-500" />
              <span>Segurança biométrica sem filas</span>
            </div>
          </div>

          {/* Totem Opção 2: CREDENTIALS_ONLY */}
          <div
            onClick={() => setTotemMode("CREDENTIALS_ONLY")}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
              totemMode === "CREDENTIALS_ONLY"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#161618]"
            }`}
          >
            {totemMode === "CREDENTIALS_ONLY" && (
              <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                  Sem Câmera
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Apenas Credenciais
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Ponto registrado imediatamente após o colaborador digitar e-mail/CPF e senha, sem abrir a câmera.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Lock size={14} className="text-slate-500" />
              <span>Ideal para computadores sem webcam</span>
            </div>
          </div>

          {/* Totem Opção 3: FULL_LIVENESS */}
          <div
            onClick={() => setTotemMode("FULL_LIVENESS")}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
              totemMode === "FULL_LIVENESS"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#161618]"
            }`}
          >
            {totemMode === "FULL_LIVENESS" && (
              <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                  Rigor Máximo
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Login + Facial Completa
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Exige autenticação por credenciais e o teste de prova de vida facial com rotação da cabeça.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldAlert size={14} className="text-blue-500" />
              <span>Maior rigor contra fraudes</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÃO DE SALVAR */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50 text-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Salvando Alterações...
            </>
          ) : (
            <>
              <Save size={18} />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
}

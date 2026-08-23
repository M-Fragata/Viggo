import { Building2 } from "lucide-react";
import { useCompany } from "../../hooks/useCompany";
import { PageHelpTooltip } from "../common/PageHelpTooltip";

export function DashboardPageHeader() {
  const { company } = useCompany();

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:items-center bg-white dark:bg-[#111113] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm mb-6 transition-colors">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Painel de Controle
          </h1>
          <PageHelpTooltip
            text="Acompanhe em tempo real a taxa de presença do dia, total de colaboradores em turno, alertas de horas extras e pendências de justificativas."
            title="Sobre o Painel Geral"
          />
        </div>
        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-400">
          Gerenciamento de frequência e auditoria biométrica em tempo real
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3.5 py-2 rounded-2xl w-full sm:w-auto">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />
          <span className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
            {company?.name}
          </span>
        </div>
      </div>
    </header>
  );
}

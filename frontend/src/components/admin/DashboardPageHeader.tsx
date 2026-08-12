import { Building2 } from "lucide-react";
import { useCompany, usePlanLimits } from "../../hooks/useCompany";
import { PlanBadge, TrialCountdown } from "../plan";

export function DashboardPageHeader() {
  const { company } = useCompany();
  const { getPlanColor } = usePlanLimits();

  const plan = company?.plan;
  void getPlanColor(plan ?? "DYNAMIC");

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:items-center bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de Controle</h1>
        <p className="text-xs sm:text-sm text-slate-400">Gerenciamento de frequência e auditoria biométrica</p>
      </div>
      <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl w-full sm:w-auto md:flex-row">
        <div className="flex gap-2">
          <Building2 className="text-emerald-600 shrink-0" size={20} />
          <span className="font-medium text-slate-700">{company?.name}</span>
        </div>
        <div className="flex gap-2">
          {plan && <PlanBadge plan={plan} size="sm" />}
          <TrialCountdown planExpiresAt={company?.planExpiresAt ?? null} status={company?.status ?? "ACTIVE"} size="sm" />
        </div>
      </div>
    </header>
  );
}

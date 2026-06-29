import { useState } from "react";
import { useCompany, usePlanLimits } from "../hooks/useCompany";
import { useAuth, useCompanyStatus } from "../hooks/useAuth";
import { PlanBadge, PlanComparisonModal, UsageProgressBar, TrialCountdown } from "../components/plan";
import { InvitesTab } from "../components/company";
import { Users, CheckCircle, LayoutList, CreditCard, Mail, ArrowUpRight, Building2, ChevronDown, ChevronUp } from "lucide-react";
import type { CompanyResponse, UsageResponse, User } from "../services/api";

const TABS = ["Funcionários", "Presentes", "Total", "Plano", "Convites"] as const;
type Tab = (typeof TABS)[number];

export function DashboardPage() {
  useAuth();
  const { company, usage, isLoading } = useCompany();
  const { getPlanLimit, getPlanColor, getPlanLabel } = usePlanLimits();
  const { isTrialExpired, getTrialDaysRemaining } = useCompanyStatus();

  const [activeTab, setActiveTab] = useState<Tab>("Funcionários");
  const [showPlanModal, setShowPlanModal] = useState(false);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const planColor = plan ? getPlanColor(plan) : "gray";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
          <div className=" flex gap-2">
            <PlanBadge plan={plan!} size="sm" />
            <TrialCountdown planExpiresAt={company?.planExpiresAt ?? null} status={company?.status!} size="sm" />
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 p-1.5 rounded-2xl w-full overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${activeTab === tab
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
              }`}
          >
            {tab === "Funcionários" && <Users size={18} className="shrink-0" />}
            {tab === "Presentes" && <CheckCircle size={18} className="shrink-0" />}
            {tab === "Total" && <LayoutList size={18} className="shrink-0" />}
            {tab === "Plano" && <CreditCard size={18} className="shrink-0" />}
            {tab === "Convites" && <Mail size={18} className="shrink-0" />}
            <span className="truncate">{tab}</span>
          </button>
        ))}
      </div>

      {activeTab === "Funcionários" && (
        <EmployeeTab company={company} usage={usage} planLimit={planLimit} />
      )}

      {activeTab === "Presentes" && (
        <PresentesTab />
      )}

      {activeTab === "Total" && (
        <TotalTab />
      )}

      {activeTab === "Plano" && (
        <PlanTab
          company={company}
          usage={usage}
          planLimit={planLimit}
          planColor={planColor}
          getPlanLabel={getPlanLabel}
          showPlanModal={showPlanModal}
          setShowPlanModal={setShowPlanModal}
          isTrialExpired={isTrialExpired}
          getTrialDaysRemaining={getTrialDaysRemaining}
        />
      )}

      {activeTab === "Convites" && (
        <InvitesTab />
      )}

      <PlanComparisonModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} currentPlan={plan!} />
    </div>
  );
}

function EmployeeTab({ company, usage, planLimit }: { company: CompanyResponse | null; usage: UsageResponse | null; planLimit: any }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800">Funcionários da Empresa</h2>
          <UsageProgressBar
            current={company?.currentEmployees ?? 0}
            limit={planLimit?.maxEmployees ?? null}
            label="Total de funcionários"
            size="md"
          />
        </div>
        <div className="sm:hidden space-y-3">
          {usage?.employees?.current === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado</div>
          ) : (
            usage?.employees?.users?.map((emp: User) => {
              const isExpanded = expandedId === emp.id;
              return (
                <div key={emp.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{emp.name}</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail</span>
                        <span className="text-sm text-slate-600">{emp.email}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Cargo</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                          {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Ativo</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-[35%] min-w-[180px]">Nome</th>
                <th className="p-4 w-[35%] min-w-[180px]">E-mail</th>
                <th className="p-4 w-[15%] min-w-[120px]">Cargo</th>
                <th className="p-4 w-[15%] min-w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {usage?.employees?.current === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado</td>
                </tr>
              ) : (
                usage?.employees.users?.map((emp: User) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{emp.name}</td>
                    <td className="p-4 text-slate-500">{emp.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                        }`}>
                        {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Ativo</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PresentesTab() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Presentes Hoje</h2>
      <p className="text-slate-500 text-center py-12">Funcionalidade de check-in do dia - integrar com API de check-ins</p>
    </div>
  );
}

function TotalTab() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Histórico Completo</h2>
      <p className="text-slate-500 text-center py-12">Histórico de todos os check-ins - integrar com API</p>
    </div>
  );
}

function PlanTab({
  company,
  planLimit,
  planColor,
  getPlanLabel,
  isTrialExpired,
  getTrialDaysRemaining,
  setShowPlanModal,
}: any) {
  const daysRemaining = company?.planExpiresAt ? getTrialDaysRemaining(company.planExpiresAt) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Plano Atual</h2>
            <p className="text-slate-500 text-sm">{getPlanLabel(company?.plan)} - R$ {planLimit?.price?.toFixed(2)}/mês</p>
          </div>
          <PlanBadge plan={company?.plan} size="lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <CreditCard className={`w-4 h-4 text-${planColor}-500`} />
              <span className="font-medium">Status</span>
            </div>
            <TrialCountdown planExpiresAt={company?.planExpiresAt ?? null} status={company?.status!} size="lg" />
          </div>

          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Users className={`w-4 h-4 text-${planColor}-500`} />
              <span className="font-medium">Funcionários</span>
            </div>
            <UsageProgressBar
              current={company?.currentEmployees ?? 0}
              limit={planLimit?.maxEmployees ?? null}
              label=""
              size="lg"
            />
          </div>

          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <ArrowUpRight className={`w-4 h-4 text-${planColor}-500`} />
              <span className="font-medium">Limites da API</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Geral</span>
                <span className="font-mono font-bold">{planLimit?.api?.general ?? "-"}/min</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Check-in</span>
                <span className="font-mono font-bold">{planLimit?.api?.checkin ?? "-"}/min</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Face Validation</span>
                <span className="font-mono font-bold">{planLimit?.api?.faceValidation ?? "-"}/min</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <button
            onClick={() => setShowPlanModal(true)}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={18} />
            Comparar Planos e Upgrade
          </button>
        </div>
      </div>

      {company?.status === "TRIAL" && !isTrialExpired && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-800">Trial de 30 dias ativo</h3>
              <p className="text-emerald-600 text-sm">{daysRemaining} dias restantes para decidir seu plano</p>
            </div>
          </div>
        </div>
      )}

      {isTrialExpired && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-red-800">Trial Expirado</h3>
              <p className="text-red-600 text-sm">Seu período de teste acabou. Faça upgrade para continuar usando.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useCompany, usePlanLimits } from "../hooks/useCompany";
import { useInvites } from "../hooks/useInvites";
import { useAuth, useCompanyStatus } from "../hooks/useAuth";
import { PlanBadge, PlanComparisonModal, UsageProgressBar, TrialCountdown } from "../components/plan";
import { InviteModal, InviteTable } from "../components/company";
import { useToast } from "../hooks/useToast";
import { Users, CheckCircle, LayoutList, CreditCard, Mail, Plus, ArrowUpRight, Building2 } from "lucide-react";

const TABS = ["Funcionários", "Presentes", "Total", "Plano", "Convites"] as const;
type Tab = (typeof TABS)[number];

export function DashboardPage() {
  useAuth();
  const { company, usage, isLoading } = useCompany();
  const { invites, isLoading: invitesLoading, fetchInvites, createInvite, cancelInvite } = useInvites();
  const { getPlanLimit, getPlanColor, getPlanLabel } = usePlanLimits();
  const { toast } = useToast();
  const { isTrialExpired, getTrialDaysRemaining } = useCompanyStatus();

  const [activeTab, setActiveTab] = useState<Tab>("Funcionários");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const planColor = plan ? getPlanColor(plan) : "gray";
  const canCreateEmployee = company?.canCreateEmployee ?? false;
  const employeeLimitReached = !canCreateEmployee && (company?.currentEmployees ?? 0) >= (planLimit?.maxEmployees ?? 0);

  const handleCreateInvite = async (data: { email: string; role: "ENTERPRISE_ADMIN" | "EMPLOYEE" }) => {
    await createInvite(data);
    fetchInvites();
    setShowInviteModal(false);
  };

  const handleCancelInvite = async (id: string) => {
    await cancelInvite(id);
    fetchInvites();
  };

  const handleCopyInviteLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de Controle</h1>
          <p className="text-xs sm:text-sm text-slate-400">Gerenciamento de frequência e auditoria biométrica</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl w-full sm:w-auto">
          <Building2 className="text-emerald-600 shrink-0" size={20} />
          <span className="font-medium text-slate-700">{company?.name}</span>
          <PlanBadge plan={plan!} size="sm" />
          <TrialCountdown planExpiresAt={company?.planExpiresAt ?? null} status={company?.status!} size="sm" />
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 p-1.5 rounded-2xl w-full overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab
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
        <InvitesTab
          invites={invites}
          isLoading={invitesLoading}
          fetchInvites={fetchInvites}
          canCreateEmployee={canCreateEmployee}
          employeeLimitReached={employeeLimitReached}
          showInviteModal={showInviteModal}
          setShowInviteModal={setShowInviteModal}
          onCreateInvite={handleCreateInvite}
          onCancelInvite={handleCancelInvite}
          onCopyLink={handleCopyInviteLink}
          baseUrl={window.location.origin}
        />
      )}

      <PlanComparisonModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} currentPlan={plan!} />
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        canCreateEmployee={canCreateEmployee}
        employeeLimitReached={employeeLimitReached}
      />
    </div>
  );
}

function EmployeeTab({ company, usage, planLimit }: { company: any; usage: any; planLimit: any }) {
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
        <div className="overflow-x-auto">
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
                company?.users?.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{emp.name}</td>
                    <td className="p-4 text-slate-500">{emp.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
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

function InvitesTab({
  invites,
  canCreateEmployee,
  employeeLimitReached,
  setShowInviteModal,
  onCancelInvite,
  onCopyLink,
  baseUrl,
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">Convites Pendentes</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          disabled={employeeLimitReached || !canCreateEmployee}
          className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus size={18} />
          Convidar Funcionário
        </button>
      </div>

      {!canCreateEmployee && !employeeLimitReached && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
          Seu plano não permite adicionar mais funcionários. <button onClick={() => setShowInviteModal(true)} className="font-bold underline">Faça upgrade</button> para convidar.
        </div>
      )}

      <InviteTable
        invites={invites}
        onCancel={onCancelInvite}
        onCopyLink={onCopyLink}
        baseUrl={baseUrl}
      />
    </div>
  );
}

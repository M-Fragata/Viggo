import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMasterCompany, useMasterActions } from "../hooks/useMaster";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { PlanBadge, TrialCountdown } from "../components/plan";
import { CompanyManageSkeleton } from "../components/master/CompanyManageSkeleton";
import { UserCheck, ArrowLeft, Users, Building2, Calendar, CreditCard, DollarSign, CheckCircle, Clock, XCircle, Loader2, type LucideIcon } from "lucide-react";
import type { CompanyStatus, PlanTier } from "../services/api";

const STATUS_LABELS: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSES: Record<string, { badge: string }> = {
  TRIAL: { badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
  ACTIVE: { badge: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
  SUSPENDED: { badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" },
  CANCELLED: { badge: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20" },
};

const STATUS_BUTTON_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
  amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20",
  red: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20",
};

const STATUS_OPTIONS: { value: CompanyStatus; label: string; icon: LucideIcon; color: string; disabled?: boolean }[] = [
  { value: "ACTIVE", label: "Ativar", icon: CheckCircle, color: "emerald" },
  { value: "SUSPENDED", label: "Suspender", icon: Clock, color: "amber" },
  { value: "CANCELLED", label: "Cancelar", icon: XCircle, color: "red" },
];

const PLAN_OPTIONS: { value: PlanTier; label: string }[] = [
  { value: "DYNAMIC", label: "Viggo" },
  { value: "ENTERPRISE_CUSTOM", label: "Enterprise" },
];

export function CompanyManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMaster, startImpersonation } = useAuth();
  const { company, isLoading, error, fetchCompany } = useMasterCompany(id!);
  const { updateStatus, updatePlan, extendTrial, impersonate } = useMasterActions();
  const { toast } = useToast();

  const [extendDays, setExtendDays] = useState(7);
  const [statusLoading, setStatusLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState<PlanTier | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [impersonateLoading, setImpersonateLoading] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleStatusChange = async (newStatus: CompanyStatus) => {
    if (!company) return;
    setStatusLoading(true);
    try {
      await updateStatus(company.id, newStatus);
      toast.success("Status alterado", { description: `${company.name} agora está ${STATUS_LABELS[newStatus]?.toLowerCase() || newStatus}` });
      fetchCompany();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePlanChange = async (newPlan: PlanTier) => {
    if (!company) return;
    setPlanLoading(newPlan);
    try {
      await updatePlan(company.id, newPlan);
      const planLabel = newPlan === "DYNAMIC" ? "Viggo" : "Enterprise";
      toast.success("Plano alterado", { description: `${company.name} agora no plano ${planLabel}` });
      fetchCompany();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar plano");
    } finally {
      setPlanLoading(null);
    }
  };

  const handleExtendTrial = async () => {
    if (!company) return;
    setTrialLoading(true);
    try {
      await extendTrial(company.id, extendDays);
      toast.success("Trial estendido", { description: `${extendDays} dias adicionados para ${company.name}` });
      fetchCompany();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao estender trial");
    } finally {
      setTrialLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!company) return;
    setImpersonateLoading(true);
    try {
      const result = await impersonate(company.id, company.name);
      startImpersonation(result.token, result.user, result.companyName);
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar impersonação");
      setImpersonateLoading(false);
    }
  };

  if (isLoading) {
    return <CompanyManageSkeleton />;
  }

  if (error || !company) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <div className="text-center py-12 text-red-500">
          {error || "Empresa não encontrada"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={20} />
        <span>Voltar</span>
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{company.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-mono">{company.cnpj}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_CLASSES[company.status]?.badge || ""}`}>
              {STATUS_LABELS[company.status] || company.status}
            </span>
            <PlanBadge plan={company.plan} size="md" />
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
            <Users size={18} />
            <span className="font-medium">Funcionários</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{company.employeesCount}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">de {company.maxEmployees === null ? "∞" : company.maxEmployees}</p>
          <div className="mt-3 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${company.employeeUsagePercent}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
            <CreditCard size={18} />
            <span className="font-medium">Plano</span>
          </div>
          <div className="mt-1">
            <PlanBadge plan={company.plan} size="lg" />
          </div>
          <div className="mt-2">
            <TrialCountdown planExpiresAt={company.planExpiresAt} status={company.status} size="md" />
          </div>
        </div>

        {company.pricing && (
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
              <DollarSign size={18} />
              <span className="font-medium">Preço Mensal</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {company.pricing.total.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {company.pricing.paidEmployees} funcionário{company.pricing.paidEmployees !== 1 ? "s" : ""} pago{company.pricing.paidEmployees !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
            <Calendar size={18} />
            <span className="font-medium">Criada em</span>
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-white">
            {new Date(company.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Health Score Detalhado */}
      {company.healthScore && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${
                  company.healthScore.score >= 80
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : company.healthScore.score >= 50
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                    : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                }`}
              >
                {company.healthScore.score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Health Score da Empresa</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      company.healthScore.level === "HEALTHY"
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : company.healthScore.level === "WARNING"
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {company.healthScore.level === "HEALTHY"
                      ? "Saudável (80-100)"
                      : company.healthScore.level === "WARNING"
                      ? "Atenção (50-79)"
                      : "Crítico (<50)"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Índice de engajamento, adoção e saúde financeira da conta
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Colaboradores */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Colaboradores</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {company.healthScore.breakdown.colaboradores.score}/20 pts
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {company.healthScore.breakdown.colaboradores.message}
              </p>
            </div>

            {/* Atividade */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Atividade Ponto</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {company.healthScore.breakdown.atividade.score}/30 pts
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {company.healthScore.breakdown.atividade.message}
              </p>
              <p className="text-[10px] text-slate-400">
                {company.recentCheckins3d ?? 0} nos últimos 3d • {company.recentCheckins7d ?? 0} nos últimos 7d
              </p>
            </div>

            {/* Biometria */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Biometria Facial</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {company.healthScore.breakdown.biometria.score}/20 pts
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {company.healthScore.breakdown.biometria.message}
              </p>
            </div>

            {/* Financeiro */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Financeiro</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {company.healthScore.breakdown.financeiro.score}/20 pts
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {company.healthScore.breakdown.financeiro.message}
              </p>
            </div>

            {/* Gestão */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gestão / Admin</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {company.healthScore.breakdown.gestao.score}/10 pts
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {company.healthScore.breakdown.gestao.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Histórico Financeiro & Faturas */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="text-purple-600 dark:text-purple-400" size={20} />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Histórico Financeiro & Faturas</h2>
          </div>
          <span className="text-xs text-slate-400">
            {company.payments?.length ?? 0} fatura{company.payments?.length !== 1 ? "s" : ""}
          </span>
        </div>

        {(!company.payments || company.payments.length === 0) ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">
            Nenhuma fatura ou transação registrada no momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Forma</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                {company.payments.map((p) => {
                  let statusBadge = "bg-slate-100 text-slate-600 border-slate-200";
                  if (p.status === "CONFIRMED" || p.status === "RECEIVED") {
                    statusBadge = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                  } else if (p.status === "OVERDUE") {
                    statusBadge = "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
                  } else if (p.status === "PENDING") {
                    statusBadge = "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        {new Date(p.dueDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        R$ {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap uppercase font-semibold text-[10px]">
                        {p.billingType}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {(p.invoiceUrl || p.paymentUrl) ? (
                          <a
                            href={p.invoiceUrl || p.paymentUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 dark:text-purple-400 hover:underline font-semibold text-xs"
                          >
                            Ver Fatura ↗
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Funcionários */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Funcionários</h2>
        {company.users.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum funcionário cadastrado</p>
        ) : (
          <div className="space-y-2">
            {company.users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/[0.02] border border-transparent dark:border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${user.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"}`}>
                  {user.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      {isMaster && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Ações</h2>

          {/* Status */}
          <div className="mb-6">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                  disabled={statusLoading || company.status === value}
                  className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                    ${company.status === value
                      ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                      : STATUS_BUTTON_CLASSES[color] || ""
                    }`}
                >
                  {statusLoading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Plano */}
          <div className="mb-6">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Plano</p>
            <div className="flex flex-wrap gap-2">
              {PLAN_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handlePlanChange(value)}
                  disabled={planLoading !== null || company.plan === value}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                    ${company.plan === value
                      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                      : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                >
                  {planLoading === value ? <Loader2 size={16} className="animate-spin" /> : label}
                </button>
              ))}
            </div>
          </div>

          {/* Trial */}
          {company.status === "TRIAL" && (
            <div className="mb-6">
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Estender Trial</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 dark:text-slate-300">Dias:</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={extendDays}
                    onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
                    className="w-20 px-3 py-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <button
                  onClick={handleExtendTrial}
                  disabled={trialLoading}
                  className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl font-bold text-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {trialLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                  Estender
                </button>
              </div>
            </div>
          )}

          {/* Impersonar */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              onClick={handleImpersonate}
              disabled={impersonateLoading}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {impersonateLoading ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
              Impersonar Empresa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

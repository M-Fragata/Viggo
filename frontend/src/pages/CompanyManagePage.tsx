import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMasterCompany, useMasterActions } from "../hooks/useMaster";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { PlanBadge, TrialCountdown } from "../components/plan";
import { CompanyManageSkeleton } from "../components/master/CompanyManageSkeleton";
import { UserCheck, ArrowLeft, Users, Building2, Calendar, CreditCard, DollarSign, CheckCircle, Clock, XCircle, Loader2, Sparkles, Sliders, X, type LucideIcon } from "lucide-react";
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

  // Enterprise Custom Plan Modal State
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [enterprisePricingModel, setEnterprisePricingModel] = useState<"FIXED" | "TIERED_EXTRA">("FIXED");
  const [enterpriseMaxEmployees, setEnterpriseMaxEmployees] = useState(100);
  const [enterprisePrice, setEnterprisePrice] = useState(299);
  const [enterpriseBasePrice, setEnterpriseBasePrice] = useState(54.90);
  const [enterpriseExtraPricePerUnit, setEnterpriseExtraPricePerUnit] = useState(3.50);
  const [enterpriseNoExpiry, setEnterpriseNoExpiry] = useState(true);
  const [enterpriseExpiryDate, setEnterpriseExpiryDate] = useState("");
  const [enterpriseSubmitting, setEnterpriseSubmitting] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleStatusChange = async (newStatus: CompanyStatus) => {
    if (!company) return;
    setStatusLoading(true);
    try {
      await updateStatus(company.id, newStatus);
      fetchCompany();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSwitchToDynamic = async () => {
    if (!company) return;
    setPlanLoading("DYNAMIC");
    try {
      await updatePlan(company.id, "DYNAMIC");
      fetchCompany();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar para plano Viggo");
    } finally {
      setPlanLoading(null);
    }
  };

  const handleOpenEnterpriseModal = () => {
    if (!company) return;
    const activeSub = company.subscriptions?.find((s) => s.status === "ACTIVE");
    const settings = (company.settings as Record<string, unknown>) || {};

    const savedModel = (settings.enterprisePricingModel as "FIXED" | "TIERED_EXTRA") || (activeSub?.extraPricePerUnit && activeSub.extraPricePerUnit < 5 ? "TIERED_EXTRA" : "FIXED");
    setEnterprisePricingModel(savedModel);

    const currentPrice = activeSub ? (activeSub.calculatedTotal ?? activeSub.price ?? 299) : 299;
    setEnterpriseMaxEmployees(company.maxEmployees && company.maxEmployees > 10 ? company.maxEmployees : 100);
    setEnterprisePrice(Number(currentPrice) || 299);
    setEnterpriseBasePrice(activeSub?.basePrice !== null && activeSub?.basePrice !== undefined ? Number(activeSub.basePrice) : 54.90);
    setEnterpriseExtraPricePerUnit(activeSub?.extraPricePerUnit !== null && activeSub?.extraPricePerUnit !== undefined ? Number(activeSub.extraPricePerUnit) : 3.50);

    if (company.planExpiresAt) {
      setEnterpriseNoExpiry(false);
      setEnterpriseExpiryDate(new Date(company.planExpiresAt).toISOString().slice(0, 10));
    } else {
      setEnterpriseNoExpiry(true);
      setEnterpriseExpiryDate("");
    }
    setShowEnterpriseModal(true);
  };

  const handleSaveEnterprisePlan = async () => {
    if (!company) return;
    if (enterpriseMaxEmployees < 1) {
      toast.error("O limite de colaboradores deve ser de no mínimo 1.");
      return;
    }
    setEnterpriseSubmitting(true);
    try {
      await updatePlan(company.id, {
        plan: "ENTERPRISE_CUSTOM",
        pricingModel: enterprisePricingModel,
        maxEmployees: Number(enterpriseMaxEmployees),
        price: enterprisePricingModel === "FIXED" ? Number(enterprisePrice) : undefined,
        basePrice: enterprisePricingModel === "TIERED_EXTRA" ? Number(enterpriseBasePrice) : undefined,
        extraPricePerUnit: enterprisePricingModel === "TIERED_EXTRA" ? Number(enterpriseExtraPricePerUnit) : undefined,
        planExpiresAt: enterpriseNoExpiry || !enterpriseExpiryDate ? null : new Date(enterpriseExpiryDate).toISOString(),
      });
      setShowEnterpriseModal(false);
      fetchCompany();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar plano Enterprise");
    } finally {
      setEnterpriseSubmitting(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!company) return;
    setTrialLoading(true);
    try {
      await extendTrial(company.id, extendDays);
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
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSwitchToDynamic}
                disabled={planLoading !== null || company.plan === "DYNAMIC"}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  company.plan === "DYNAMIC"
                    ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                {planLoading === "DYNAMIC" ? <Loader2 size={16} className="animate-spin" /> : "Viggo (Dinâmico)"}
              </button>

              <button
                onClick={handleOpenEnterpriseModal}
                disabled={planLoading !== null}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                  company.plan === "ENTERPRISE_CUSTOM"
                    ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                    : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                <Sparkles size={16} className="text-amber-500" />
                <span>{company.plan === "ENTERPRISE_CUSTOM" ? "Enterprise Personalizado" : "Enterprise"}</span>
              </button>

              {company.plan === "ENTERPRISE_CUSTOM" && (
                <button
                  onClick={handleOpenEnterpriseModal}
                  className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sliders size={14} />
                  <span>Personalizar Contrato Enterprise</span>
                </button>
              )}
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

      {/* Modal de Plano Enterprise Personalizado */}
      {showEnterpriseModal && (
        <EnterprisePlanModal
          companyName={company.name}
          currentEmployees={company.employeesCount}
          pricingModel={enterprisePricingModel}
          setPricingModel={setEnterprisePricingModel}
          maxEmployees={enterpriseMaxEmployees}
          setMaxEmployees={setEnterpriseMaxEmployees}
          price={enterprisePrice}
          setPrice={setEnterprisePrice}
          basePrice={enterpriseBasePrice}
          setBasePrice={setEnterpriseBasePrice}
          extraPricePerUnit={enterpriseExtraPricePerUnit}
          setExtraPricePerUnit={setEnterpriseExtraPricePerUnit}
          noExpiry={enterpriseNoExpiry}
          setNoExpiry={setEnterpriseNoExpiry}
          expiryDate={enterpriseExpiryDate}
          setExpiryDate={setEnterpriseExpiryDate}
          loading={enterpriseSubmitting}
          onClose={() => setShowEnterpriseModal(false)}
          onConfirm={handleSaveEnterprisePlan}
        />
      )}
    </div>
  );
}

interface EnterprisePlanModalProps {
  companyName: string;
  currentEmployees: number;
  pricingModel: "FIXED" | "TIERED_EXTRA";
  setPricingModel: (m: "FIXED" | "TIERED_EXTRA") => void;
  maxEmployees: number;
  setMaxEmployees: (n: number) => void;
  price: number;
  setPrice: (p: number) => void;
  basePrice: number;
  setBasePrice: (b: number) => void;
  extraPricePerUnit: number;
  setExtraPricePerUnit: (e: number) => void;
  noExpiry: boolean;
  setNoExpiry: (b: boolean) => void;
  expiryDate: string;
  setExpiryDate: (s: string) => void;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function EnterprisePlanModal({
  companyName,
  currentEmployees,
  pricingModel,
  setPricingModel,
  maxEmployees,
  setMaxEmployees,
  price,
  setPrice,
  basePrice,
  setBasePrice,
  extraPricePerUnit,
  setExtraPricePerUnit,
  noExpiry,
  setNoExpiry,
  expiryDate,
  setExpiryDate,
  loading,
  onClose,
  onConfirm,
}: EnterprisePlanModalProps) {
  const employeePresets = [25, 50, 100, 250, 500, 1000];
  const pricePresets = [149, 299, 499, 890, 1490];
  const extraUnitPresets = [4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5];

  // Cálculo da simulação em tempo real
  const currentExtras = Math.max(0, currentEmployees - 10);
  const simulatedTieredTotal = basePrice + currentExtras * extraPricePerUnit;
  const standardTieredTotal = 54.9 + currentExtras * 5.0;
  const simulatedEconomy = Math.max(0, standardTieredTotal - simulatedTieredTotal);
  const economyPercent = extraPricePerUnit < 5.0 ? Math.round(((5.0 - extraPricePerUnit) / 5.0) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Gerar Plano Enterprise</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize os termos de contrato para <strong>{companyName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Seletor de Modelo de Precificação */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider block">
              Modelo de Precificação Enterprise
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPricingModel("TIERED_EXTRA")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  pricingModel === "TIERED_EXTRA"
                    ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-slate-900 dark:text-white shadow-xs ring-1 ring-amber-500/20"
                    : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <Sliders size={14} /> Base + Excedente com Desconto
                  </span>
                  {pricingModel === "TIERED_EXTRA" && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  R$ 54,90 base (até 10 func) + valor reduzido por funcionário extra.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPricingModel("FIXED")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  pricingModel === "FIXED"
                    ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-slate-900 dark:text-white shadow-xs ring-1 ring-amber-500/20"
                    : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <DollarSign size={14} /> Valor Fixo Fechado
                  </span>
                  {pricingModel === "FIXED" && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Mensalidade fixa independente da quantidade de marcações ou colaboradores.
                </p>
              </button>
            </div>
          </div>

          {/* Limite de Colaboradores */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                Capacidade Máxima de Colaboradores
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Atualmente: <strong>{currentEmployees}</strong> cadastrado(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50000"
                value={maxEmployees}
                onChange={(e) => setMaxEmployees(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            {/* Presets de Funcionários */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {employeePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMaxEmployees(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    maxEmployees === preset
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  {preset} func.
                </button>
              ))}
            </div>
          </div>

          {/* Campos Específicos do Modo Base + Excedente */}
          {pricingModel === "TIERED_EXTRA" ? (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Valor Base */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider block">
                    Valor Base (até 10 func.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Valor do Funcionário Extra */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider block">
                      Valor por Func. Extra
                    </label>
                    <span className="text-[10px] text-slate-400 line-through">Padrão: R$ 5,00</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={extraPricePerUnit}
                      onChange={(e) => setExtraPricePerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Presets do valor por extra */}
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5">
                  Valores rápidos por colaborador extra:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {extraUnitPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setExtraPricePerUnit(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        extraPricePerUnit === preset
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/40"
                      }`}
                    >
                      R$ {preset.toFixed(2)} {preset < 5 ? `(-${Math.round(((5 - preset) / 5) * 100)}%)` : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulação em Tempo Real para os colaboradores atuais */}
              <div className="pt-2 border-t border-amber-200/50 dark:border-amber-900/30 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>10 primeiros colaboradores (Base):</span>
                  <span className="font-semibold text-slate-800 dark:text-white">R$ {basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>{currentExtras} colaborador(es) extra(s) × R$ {extraPricePerUnit.toFixed(2)}:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    R$ {(currentExtras * extraPricePerUnit).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 text-slate-800 dark:text-white">
                  <span>Faturamento Mensal Atual ({currentEmployees} func):</span>
                  <span className="text-emerald-600 dark:text-emerald-400">R$ {simulatedTieredTotal.toFixed(2)} / mês</span>
                </div>
                {simulatedEconomy > 0 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium pt-0.5">
                    ✨ Economia contratual de <strong>R$ {simulatedEconomy.toFixed(2)}/mês</strong> ({economyPercent}% de desconto nos adicionais)
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Campos do Modo Valor Fixo Fechado */
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider block">
                Valor da Mensalidade Fixa (R$ / mês)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  placeholder="0.00"
                />
              </div>
              {/* Presets Preço Fixo */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pricePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPrice(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      price === preset
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    R$ {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vigência / Expiração */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/10">
            <label className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider block">
              Vigência do Contrato
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={noExpiry}
                onChange={(e) => setNoExpiry(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Contrato sem data de expiração fixa (recorrente contínuo)</span>
            </label>

            {!noExpiry && (
              <div className="pt-2 animate-in fade-in duration-150">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Card Resumo */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                Resumo do Contrato Enterprise
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                {pricingModel === "TIERED_EXTRA" ? "DINÂMICO CUSTOMIZADO" : "VALOR FIXO"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Capacidade Contratada:</span>
                <span className="font-bold text-slate-800 dark:text-white">Até {maxEmployees} colaboradores</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Modelo Financeiro:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {pricingModel === "TIERED_EXTRA"
                    ? `R$ ${basePrice.toFixed(2)} base + R$ ${extraPricePerUnit.toFixed(2)}/extra`
                    : price === 0
                    ? "Sob Medida / Isento"
                    : `R$ ${price.toFixed(2)}/mês fixo`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Salvar e Ativar Plano Enterprise</span>
          </button>
        </div>
      </div>
    </div>
  );
}

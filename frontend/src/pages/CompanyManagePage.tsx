import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMasterCompany, useMasterActions } from "../hooks/useMaster";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { PlanBadge, TrialCountdown } from "../components/plan";
import { CompanyManageSkeleton } from "../components/master/CompanyManageSkeleton";
import { UserCheck, ArrowLeft, Users, Building2, Calendar, CreditCard, DollarSign, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import type { CompanyStatus, PlanTier } from "../services/api";

const STATUS_LABELS: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  TRIAL: "emerald",
  ACTIVE: "blue",
  SUSPENDED: "amber",
  CANCELLED: "red",
};

const STATUS_OPTIONS: { value: CompanyStatus; label: string; icon: any; color: string; disabled?: boolean }[] = [
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
      toast.success("Status alterado", { description: `${company.name} agora está ${STATUS_LABELS[newStatus].toLowerCase()}` });
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
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
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
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={20} />
        <span>Voltar</span>
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
              <p className="text-slate-500 text-sm">{company.cnpj}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-${STATUS_COLORS[company.status]}-50 text-${STATUS_COLORS[company.status]}-700 border border-${STATUS_COLORS[company.status]}-200`}>
              {STATUS_LABELS[company.status]}
            </span>
            <PlanBadge plan={company.plan} size="md" />
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Users size={18} />
            <span className="font-medium">Funcionários</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{company.employeesCount}</p>
          <p className="text-sm text-slate-400">de {company.maxEmployees === null ? "∞" : company.maxEmployees}</p>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${company.employeeUsagePercent}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <CreditCard size={18} />
            <span className="font-medium">Plano</span>
          </div>
          <div className="mt-1">
            <PlanBadge plan={company.plan} size="lg" />
          </div>
          <TrialCountdown planExpiresAt={company.planExpiresAt} status={company.status} size="md" />
        </div>

        {company.pricing && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <DollarSign size={18} />
              <span className="font-medium">Preço Mensal</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              R$ {company.pricing.total.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {company.pricing.paidEmployees} funcionário{company.pricing.paidEmployees !== 1 ? "s" : ""} pago{company.pricing.paidEmployees !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Calendar size={18} />
            <span className="font-medium">Criada em</span>
          </div>
          <p className="text-lg font-bold text-slate-800">
            {new Date(company.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Funcionários */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Funcionários</h2>
        {company.users.length === 0 ? (
          <p className="text-slate-400 text-sm">Nenhum funcionário cadastrado</p>
        ) : (
          <div className="space-y-2">
            {company.users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-600">
                      {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${user.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                  {user.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      {isMaster && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Ações</h2>

          {/* Status */}
          <div className="mb-6">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                  disabled={statusLoading || company.status === value}
                  className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                    ${company.status === value
                      ? "bg-slate-100 text-slate-400"
                      : `bg-${color}-50 text-${color}-600 hover:bg-${color}-100`
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
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Plano</p>
            <div className="flex flex-wrap gap-2">
              {PLAN_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handlePlanChange(value)}
                  disabled={planLoading !== null || company.plan === value}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                    ${company.plan === value
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
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
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Estender Trial</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Dias:</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={extendDays}
                    onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                </div>
                <button
                  onClick={handleExtendTrial}
                  disabled={trialLoading}
                  className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-100 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {trialLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                  Estender
                </button>
              </div>
            </div>
          )}

          {/* Impersonar */}
          <div className="pt-4 border-t border-slate-100">
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

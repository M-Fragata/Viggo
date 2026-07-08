import { useState, useEffect } from "react";
import { Search, MoreVertical, Building2, CheckCircle, Clock, XCircle, UserCheck, Loader2 } from "lucide-react";
import { useMasterCompanies, useMasterActions } from "../hooks/useMaster";
import { PlanBadge, TrialCountdown } from "../components/plan";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import type { CompanyStatus, PlanTier } from "../services/api";

const STATUS_LABELS: Record<CompanyStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS: Record<CompanyStatus, string> = {
  TRIAL: "emerald",
  ACTIVE: "blue",
  SUSPENDED: "amber",
  CANCELLED: "red",
};

export function MasterCompanies() {
  const { companies, pagination, isLoading, error, fetchCompanies } = useMasterCompanies();
  const { updatePlan, updateStatus, extendTrial, impersonate } = useMasterActions();
  const { toast } = useToast();
  const { isMaster } = useAuth();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "">("");
  const [planFilter, setPlanFilter] = useState<PlanTier | "">("");
  const [search, setSearch] = useState("");
  const [showActions, setShowActions] = useState<string | null>(null);
  const [actionCompany, setActionCompany] = useState<{ id: string; name: string } | null>(null);
  const [extendDays, setExtendDays] = useState(7);

  useEffect(() => {
    fetchCompanies({ page, limit, status: statusFilter || undefined, plan: planFilter || undefined, search: search || undefined });
  }, [page, statusFilter, planFilter, search, fetchCompanies]);

  const handleStatusChange = async (newStatus: CompanyStatus) => {
    if (!actionCompany) return;
    try {
      await updateStatus(actionCompany.id, newStatus);
      toast.success("Status alterado", { description: `${actionCompany.name} agora está ${STATUS_LABELS[newStatus].toLowerCase()}` });
      setShowActions(null);
      setActionCompany(null);
      fetchCompanies({ page, limit, status: statusFilter || undefined, plan: planFilter || undefined, search: search || undefined });
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handlePlanChange = async (newPlan: PlanTier) => {
    if (!actionCompany) return;
    try {
      await updatePlan(actionCompany.id, newPlan);
      toast.success("Plano alterado", { description: `${actionCompany.name} agora no ${newPlan}` });
      setShowActions(null);
      setActionCompany(null);
      fetchCompanies({ page, limit, status: statusFilter || undefined, plan: planFilter || undefined, search: search || undefined });
    } catch {
      toast.error("Erro ao alterar plano");
    }
  };

  const handleExtendTrial = async () => {
    if (!actionCompany) return;
    try {
      await extendTrial(actionCompany.id, extendDays);
      toast.success("Trial estendido", { description: `${extendDays} dias adicionados para ${actionCompany.name}` });
      setShowActions(null);
      setActionCompany(null);
      fetchCompanies({ page, limit, status: statusFilter || undefined, plan: planFilter || undefined, search: search || undefined });
    } catch {
      toast.error("Erro ao estender trial");
    }
  };

  const handleImpersonate = async () => {
    if (!actionCompany) return;
    try {
      const result = await impersonate(actionCompany.id, actionCompany.name);
      const { startImpersonation } = await import("../hooks/useAuth").then(m => m.useAuth());
      startImpersonation(result.token, result.user, result.companyName);
      window.location.href = "/";
    } catch {
      toast.error("Erro ao iniciar impersonação");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Erro ao carregar empresas: {error}</div>;
  }

  return (
    <div className="space-y-6 p-4 mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empresas</h1>
          <p className="text-slate-500 text-sm">Gerencie todas as empresas da plataforma</p>
        </div>
        <div className="flex gap-2 items-center">
          {isLoading && companies.length > 0 && (
            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
          )}
          <span className="text-sm text-slate-500">{pagination?.total ?? 0} empresas</span>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CompanyStatus)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors bg-white"
            >
              <option value="">Todos os status</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Ativa</option>
              <option value="SUSPENDED">Suspensa</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as PlanTier)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors bg-white"
            >
              <option value="">Todos os planos</option>
              <option value="TIER_I">Tier I</option>
              <option value="TIER_II">Tier II</option>
              <option value="TIER_III">Tier III</option>
              <option value="ENTERPRISE_CUSTOM">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-12"></th>
                <th className="p-4 w-[30%] min-w-[200px]">Empresa</th>
                <th className="p-4 w-[15%] min-w-[140px]">CNPJ</th>
                <th className="p-4 w-[12%] min-w-[100px]">Plano</th>
                <th className="p-4 w-[12%] min-w-[100px]">Status</th>
                <th className="p-4 w-[15%] min-w-[120px]">Funcionários</th>
                <th className="p-4 w-[12%] min-w-[100px]">Trial/Validade</th>
                <th className="p-4 w-16 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Nenhuma empresa encontrada</td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{company.name}</td>
                    <td className="p-4 text-slate-500 font-mono text-xs">{company.cnpj ?? "Não informado"}</td>
                    <td className="p-4">
                      <PlanBadge plan={company.plan} size="sm" />
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-${STATUS_COLORS[company.status]}-50 text-${STATUS_COLORS[company.status]}-700 border border-${STATUS_COLORS[company.status]}-200`}>
                        {STATUS_LABELS[company.status]}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl text-xs">
                          {company.employeesCount}/{company.maxEmployees === null ? "∞" : company.maxEmployees}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${company.employeeUsagePercent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <TrialCountdown planExpiresAt={company.planExpiresAt} status={company.status} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(showActions === company.id ? null : company.id);
                            setActionCompany({ id: company.id, name: company.name });
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical size={20} />
                        </button>
                        {showActions === company.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActions(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 animate-in zoom-in-95">
                              <button
                                onClick={() => handleStatusChange("ACTIVE")}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 ${company.status === "ACTIVE" ? "text-slate-400" : "text-emerald-600"}`}
                              >
                                <CheckCircle size={16} /> Ativar
                              </button>
                              <button
                                onClick={() => handleStatusChange("SUSPENDED")}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 ${company.status === "SUSPENDED" ? "text-slate-400" : "text-amber-600"}`}
                              >
                                <Clock size={16} /> Suspender
                              </button>
                              <button
                                onClick={() => handleStatusChange("CANCELLED")}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 ${company.status === "CANCELLED" ? "text-slate-400" : "text-red-600"}`}
                              >
                                <XCircle size={16} /> Cancelar
                              </button>
                              <hr className="my-1 border-slate-100" />
                              <div className="px-3 py-2 space-y-2">
                                <p className="text-xs font-medium text-slate-500">Alterar Plano</p>
                                {["TIER_I", "TIER_II", "TIER_III", "ENTERPRISE_CUSTOM"].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => handlePlanChange(p as PlanTier)}
                                    className={`w-full px-3 py-1.5 text-left text-xs rounded-lg hover:bg-slate-50 ${company.plan === p ? "bg-emerald-50 text-emerald-600" : "text-slate-600"}`}
                                  >
                                    {p.replace("TIER_", "Tier ").replace("ENTERPRISE_CUSTOM", "Enterprise")}
                                  </button>
                                ))}
                              </div>
                              {isMaster && (
                                <>
                                  <hr className="my-1 border-slate-100" />
                                  <button
                                    onClick={handleImpersonate}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 text-emerald-600"
                                  >
                                    <UserCheck size={16} /> Impersonar
                                  </button>
                                </>
                              )}
                              {company.status === "TRIAL" && (
                                <>
                                  <hr className="my-1 border-slate-100" />
                                  <div className="px-3 py-2 space-y-2">
                                    <p className="text-xs font-medium text-slate-500">Estender Trial</p>
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={extendDays}
                                        onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
                                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-emerald-400 outline-none"
                                      />
                                      <button
                                        onClick={handleExtendTrial}
                                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600"
                                      >
                                        Aplicar
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
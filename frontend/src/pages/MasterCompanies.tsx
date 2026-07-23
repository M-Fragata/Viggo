import { useState, useEffect } from "react";
import { Search, Building2, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useMasterCompanies } from "../hooks/useMaster";
import { PlanBadge, TrialCountdown } from "../components/plan";
import type { CompanyStatus, PlanTier } from "../services/api";
import { useNavigate } from "react-router";

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
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "">("");
  const [planFilter, setPlanFilter] = useState<PlanTier | "">("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies({ page, limit, status: statusFilter || undefined, plan: planFilter || undefined, search: search || undefined });
  }, [page, statusFilter, planFilter, search, fetchCompanies]);

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

      {/* Mobile View */}
      <div className="sm:hidden space-y-3">
        {companies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center text-slate-400">
            Nenhuma empresa encontrada
          </div>
        ) : (
          companies.map((company) => {
            const isExpanded = expandedId === company.id;
            return (
              <div key={company.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : company.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 block">{company.name}</span>
                      <span className="text-xs text-slate-400">{company.cnpj}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Plano</span>
                        <PlanBadge plan={company.plan} size="sm" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-${STATUS_COLORS[company.status]}-50 text-${STATUS_COLORS[company.status]}-700`}>
                          {STATUS_LABELS[company.status]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Funcionários</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl text-xs">
                          {company.employeesCount}/{company.maxEmployees === null ? "∞" : company.maxEmployees}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${company.employeeUsagePercent}%` }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Validade</span>
                      <TrialCountdown planExpiresAt={company.planExpiresAt} status={company.status} size="sm" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/master/companies/${company.id}`);
                      }}
                      className="w-full mt-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2"
                    >
                      <Settings size={16} />
                      Gerenciar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-12"></th>
                <th className="p-4 w-[25%] min-w-[180px]">Empresa</th>
                <th className="p-4 w-[15%] min-w-[130px]">CNPJ</th>
                <th className="p-4 w-[10%] min-w-[90px]">Plano</th>
                <th className="p-4 w-[12%] min-w-[100px]">Status</th>
                <th className="p-4 w-[15%] min-w-[120px]">Funcionários</th>
                <th className="p-4 w-[15%] min-w-[120px]">Validade</th>
                <th className="p-4 w-[10%] min-w-[100px] text-right">Ações</th>
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
                    <td className="p-4 text-slate-500 font-mono text-xs">{company.cnpj}</td>
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
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${company.employeeUsagePercent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <TrialCountdown planExpiresAt={company.planExpiresAt} status={company.status} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/master/companies/${company.id}`)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-xs flex items-center gap-1.5 ml-auto"
                      >
                        <Settings size={14} />
                        Gerenciar
                      </button>
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

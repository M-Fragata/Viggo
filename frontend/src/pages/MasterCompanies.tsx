import { useState, useEffect } from "react";
import { Search, Building2, ChevronDown, ChevronUp, Settings, Download, Activity } from "lucide-react";
import { useMasterCompanies, useMasterActions } from "../hooks/useMaster";
import { PlanBadge, TrialCountdown } from "../components/plan";
import { MasterCompaniesSkeleton } from "../components/master/MasterCompaniesSkeleton";
import type { CompanyStatus, PlanTier, MasterHealthScoreBreakdown } from "../services/api";
import { useNavigate } from "react-router";

const STATUS_LABELS: Record<CompanyStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSES: Record<CompanyStatus, { badge: string }> = {
  TRIAL: { badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
  ACTIVE: { badge: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
  SUSPENDED: { badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" },
  CANCELLED: { badge: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20" },
};

function HealthBadge({ score, level }: { score?: number | MasterHealthScoreBreakdown; level?: "HEALTHY" | "WARNING" | "CRITICAL" }) {
  const numericScore = typeof score === "object" ? score?.score : score;
  if (numericScore === undefined) return <span className="text-slate-400">—</span>;

  let color = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
  if (numericScore < 50 || level === "CRITICAL") {
    color = "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20";
  } else if (numericScore < 80 || level === "WARNING") {
    color = "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}
      title={`Health Score: ${numericScore}/100`}
    >
      <Activity size={11} />
      <span>{numericScore}</span>
    </span>
  );
}

export function MasterCompanies() {
  const { companies, pagination, isLoading, error, fetchCompanies } = useMasterCompanies();
  const { exportCompanies } = useMasterActions();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "">("");
  const [planFilter, setPlanFilter] = useState<PlanTier | "">("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies({ page, limit, status: statusFilter || undefined, plan: planFilter || undefined, search: search || undefined });
  }, [page, limit, statusFilter, planFilter, search, fetchCompanies]);

  const handleExport = () => {
    exportCompanies({
      status: statusFilter || undefined,
      plan: planFilter || undefined,
      search: search || undefined,
    });
  };

  if (isLoading) {
    return <MasterCompaniesSkeleton />;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Erro ao carregar empresas: {error}</div>;
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Empresas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie todas as empresas da plataforma</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {pagination?.total ?? 0} empresas
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition-colors text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CompanyStatus)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition-colors cursor-pointer text-sm"
            >
              <option value="" className="dark:bg-[#121212]">Todos os status</option>
              <option value="TRIAL" className="dark:bg-[#121212]">Trial</option>
              <option value="ACTIVE" className="dark:bg-[#121212]">Ativa</option>
              <option value="SUSPENDED" className="dark:bg-[#121212]">Suspensa</option>
              <option value="CANCELLED" className="dark:bg-[#121212]">Cancelada</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as PlanTier)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition-colors cursor-pointer text-sm"
            >
              <option value="" className="dark:bg-[#121212]">Todos os planos</option>
              <option value="DYNAMIC" className="dark:bg-[#121212]">Viggo</option>
              <option value="ENTERPRISE_CUSTOM" className="dark:bg-[#121212]">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden space-y-3">
        {companies.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-8 text-center text-slate-400 dark:text-slate-500">
            Nenhuma empresa encontrada
          </div>
        ) : (
          companies.map((company) => {
            const isExpanded = expandedId === company.id;
            return (
              <div key={company.id} className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : company.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white block">{company.name}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{company.cnpj}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HealthBadge score={company.healthScore} level={company.healthLevel} />
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/10 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Plano</span>
                        <PlanBadge plan={company.plan} size="sm" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CLASSES[company.status].badge}`}>
                          {STATUS_LABELS[company.status]}
                        </span>
                      </div>
                    </div>
                    {company.pricing && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Preço Mensal</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {company.pricing.total.toFixed(2)}/mês
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Funcionários</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-xl text-xs">
                          {company.employeesCount}/{company.maxEmployees === null ? "∞" : company.maxEmployees}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${company.employeeUsagePercent}%` }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Validade</span>
                      <TrialCountdown planExpiresAt={company.planExpiresAt} status={company.status} size="sm" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/master/companies/${company.id}`);
                      }}
                      className="w-full mt-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 cursor-pointer"
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
      <div className="hidden sm:block bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-12"></th>
                <th className="p-4 w-[20%] min-w-[150px]">Empresa</th>
                <th className="p-4 w-[12%] min-w-[110px]">CNPJ</th>
                <th className="p-4 w-[8%] min-w-[80px]">Plano</th>
                <th className="p-4 w-[10%] min-w-[80px]">Status</th>
                <th className="p-4 w-[10%] min-w-[80px]">Health</th>
                <th className="p-4 w-[12%] min-w-[100px]">Funcionários</th>
                <th className="p-4 w-[10%] min-w-[80px]">Preço</th>
                <th className="p-4 w-[10%] min-w-[90px]">Validade</th>
                <th className="p-4 w-[8%] min-w-[80px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-sm text-slate-600 dark:text-slate-300">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhuma empresa encontrada</td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-white">{company.name}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{company.cnpj}</td>
                    <td className="p-4">
                      <PlanBadge plan={company.plan} size="sm" />
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CLASSES[company.status].badge}`}>
                        {STATUS_LABELS[company.status]}
                      </span>
                    </td>
                    <td className="p-4">
                      <HealthBadge score={company.healthScore} level={company.healthLevel} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-xl text-xs">
                          {company.employeesCount}/{company.maxEmployees === null ? "∞" : company.maxEmployees}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${company.employeeUsagePercent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {company.pricing ? (
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {company.pricing.total.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <TrialCountdown planExpiresAt={company.planExpiresAt} status={company.status} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/master/companies/${company.id}`)}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors font-medium text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
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
          <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

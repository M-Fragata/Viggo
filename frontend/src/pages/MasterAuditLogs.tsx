import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router";
import { useMasterAuditLogs } from "../hooks/useMaster";
import type { MasterAuditLogItem } from "../services/api";

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  IMPERSONATE: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800/50",
  },
  LOGIN: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/50",
  },
  CHECKIN: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/50",
  },
  FACE_VALIDATION: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/50",
  },
  FACE_REGISTER: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/50",
  },
  CREATE: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800/50",
  },
  UPDATE: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800/50",
  },
  DELETE: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800/50",
  },
  EXPORT: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
  },
};

export function MasterAuditLogs() {
  const { logs, pagination, isLoading, error, fetchAuditLogs } = useMasterAuditLogs();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<MasterAuditLogItem | null>(null);

  useEffect(() => {
    fetchAuditLogs({
      page,
      limit: 20,
      search: submittedSearch || undefined,
      action: actionFilter || undefined,
    });
  }, [page, actionFilter, submittedSearch, fetchAuditLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(search);
  };

  const clearFilters = () => {
    setSearch("");
    setSubmittedSearch("");
    setActionFilter("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-purple-600 dark:text-purple-400" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Logs de Auditoria & LGPD</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Trilha de auditoria imutável de todas as ações administrativas, autenticações e acessos aos dados.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search input */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuário, empresa, IP ou finalidade..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>

          {/* Action Filter */}
          <div className="sm:col-span-4 relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Todas as Ações</option>
              <option value="IMPERSONATE">IMPERSONATE (Acesso Master)</option>
              <option value="LOGIN">LOGIN (Autenticação)</option>
              <option value="CHECKIN">CHECKIN (Ponto)</option>
              <option value="FACE_VALIDATION">FACE_VALIDATION (Biometria)</option>
              <option value="FACE_REGISTER">FACE_REGISTER (Cadastro Facial)</option>
              <option value="CREATE">CREATE (Criação)</option>
              <option value="UPDATE">UPDATE (Alteração)</option>
              <option value="DELETE">DELETE (Exclusão)</option>
              <option value="EXPORT">EXPORT (Exportação)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              Filtrar
            </button>
            {(search || actionFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Limpar filtros"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Entidade</th>
                  <th className="py-3 px-4">IP</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded-md shimmer" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded shimmer" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded shimmer ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={40} />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhum registro encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Entidade</th>
                  <th className="py-3 px-4">IP</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                {logs.map((log) => {
                  const actionStyle = ACTION_COLORS[log.action] || {
                    bg: "bg-slate-50 dark:bg-slate-800",
                    text: "text-slate-700 dark:text-slate-300",
                    border: "border-slate-200 dark:border-slate-700",
                  };

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.user ? (
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white truncate max-w-[160px]">
                              {log.user.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {log.user.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sistema / Anônimo</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.company ? (
                          <Link
                            to={`/master/companies/${log.company.id}`}
                            className="font-medium text-purple-600 dark:text-purple-400 hover:underline truncate max-w-[160px] block"
                          >
                            {log.company.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                          {log.entity}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {log.ip || "-"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total de <strong>{pagination.total}</strong> registros — Página <strong>{pagination.page}</strong> de{" "}
              <strong>{pagination.totalPages}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151518] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-purple-600 dark:text-purple-400" size={20} />
                <h3 className="font-bold text-slate-900 dark:text-white">Detalhes do Registro de Auditoria</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Top Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ação</span>
                  <span className="font-bold text-slate-800 dark:text-white">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Entidade</span>
                  <span className="font-mono text-slate-800 dark:text-white">
                    {selectedLog.entity} {selectedLog.entityId ? `(#${selectedLog.entityId.slice(0, 8)})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Data / Hora</span>
                  <span className="font-mono text-slate-800 dark:text-white">{formatDateTime(selectedLog.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Usuário</span>
                  <span className="text-slate-800 dark:text-white font-medium">
                    {selectedLog.user ? selectedLog.user.name : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Empresa</span>
                  <span className="text-slate-800 dark:text-white font-medium">
                    {selectedLog.company ? selectedLog.company.name : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Endereço IP</span>
                  <span className="font-mono text-slate-800 dark:text-white">{selectedLog.ip || "N/A"}</span>
                </div>
              </div>

              {/* LGPD Context */}
              <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30 space-y-2">
                <h4 className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Enquadramento Legal (LGPD)</span>
                </h4>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <p>
                    <strong className="text-slate-900 dark:text-white">Base Legal:</strong>{" "}
                    {selectedLog.legalBasis || "Art. 7º, V — Execução de contrato"}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">Finalidade:</strong>{" "}
                    {selectedLog.purpose || "Operação padrão do sistema"}
                  </p>
                  {selectedLog.personalDataCategories && (
                    <p>
                      <strong className="text-slate-900 dark:text-white">Categorias de Dados:</strong>{" "}
                      {Array.isArray(selectedLog.personalDataCategories)
                        ? selectedLog.personalDataCategories.join(", ")
                        : JSON.stringify(selectedLog.personalDataCategories)}
                    </p>
                  )}
                </div>
              </div>

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Dispositivo / Navegador (User-Agent)
                  </span>
                  <p className="p-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-400 font-mono text-[11px] break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {/* Data payload: Old vs New */}
              {(selectedLog.oldData || selectedLog.newData) && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Dados Alterados (Payload)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedLog.oldData && (
                      <div>
                        <span className="text-[10px] font-bold text-red-500 block mb-1">Dados Anteriores</span>
                        <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(selectedLog.oldData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.newData && (
                      <div className={selectedLog.oldData ? "" : "sm:col-span-2"}>
                        <span className="text-[10px] font-bold text-emerald-500 block mb-1">Novos Dados</span>
                        <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(selectedLog.newData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

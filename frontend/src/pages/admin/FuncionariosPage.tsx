import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import {
  Users,
  UserCheck,
  Shield,
  Clock,
  Search,
  X,
  Plus,
  Calendar,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from "lucide-react";
import { useCompany } from "../../hooks/useCompany";
import { EmployeeTabSkeleton } from "../../components/EmployeeTabSkeleton";
import { EmployeeScheduleModal } from "../../components/company/EmployeeScheduleModal";
import { PageHeader } from "../../components/common/PageHeader";
import type { EmployeeListItem, WorkScheduleResponse } from "../../services/api";
import { api } from "../../services/api";

export function FuncionariosPage() {
  const { isLoading: isLoadingCompany } = useCompany();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<WorkScheduleResponse[]>([]);
  const [scheduleModalEmployee, setScheduleModalEmployee] = useState<{ id: string; name: string; scheduleId: string | null } | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "EMPLOYEE" | "ENTERPRISE_ADMIN">("ALL");

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoadingEmployees(true);
      const data = await api.employees.list(selectedDate);
      setEmployees(data);
    } catch {
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [selectedDate]);

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await api.workSchedules.list();
      setSchedules(data);
    } catch {
      setSchedules([]);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchSchedules();
  }, [fetchEmployees, fetchSchedules]);

  // Lista filtrada
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "EMPLOYEE" && emp.role === "EMPLOYEE") ||
        (roleFilter === "ENTERPRISE_ADMIN" && emp.role !== "EMPLOYEE");

      return matchesSearch && matchesRole;
    });
  }, [employees, searchTerm, roleFilter]);

  // Métricas
  const totalEmployees = employees.length;
  const regularEmployeesCount = employees.filter((e) => e.role === "EMPLOYEE").length;
  const adminEmployeesCount = employees.filter((e) => e.role !== "EMPLOYEE").length;
  const withScheduleCount = employees.filter((e) => !!e.workScheduleId).length;

  if (isLoadingCompany) {
    return (
      <div className="w-full space-y-6 min-w-0">
        <PageHeader
          title="Colaboradores"
          subtitle="Gerenciamento de funcionários e escalas de trabalho"
          helpText="Cadastre novos membros da equipe, edite dados cadastrais, gerencie permissões e visualize a lista completa de funcionários da empresa."
        />
        <EmployeeTabSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 min-w-0">
      <PageHeader
        title="Colaboradores"
        subtitle="Gerenciamento de funcionários e escalas de trabalho"
        helpText="Cadastre novos membros da equipe, edite dados cadastrais, gerencie permissões e visualize a lista completa de funcionários da empresa."
        actions={
          <Link
            to="/convites"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Convidar Colaborador</span>
          </Link>
        }
      />

      {/* 4 Cards de Métricas da Equipe */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Equipe</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{totalEmployees}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Funcionários</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{regularEmployeesCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Shield size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Admins</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{adminEmployeesCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Com Escala</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">
              {withScheduleCount} <span className="text-xs text-slate-400 font-normal">/ {totalEmployees}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Card Principal da Tabela */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-4 sm:p-6 transition-colors w-full overflow-hidden min-w-0 space-y-6">
        {/* Barra Superior de Filtros e Busca Responsiva */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtros de Cargo e Data */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "ALL" | "EMPLOYEE" | "ENTERPRISE_ADMIN")}
              className="px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Todos os Cargos</option>
              <option value="EMPLOYEE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Apenas Funcionários</option>
              <option value="ENTERPRISE_ADMIN" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Apenas Administradores</option>
            </select>

            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
              <Calendar size={15} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              />
            </div>

            {(searchTerm || roleFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("ALL");
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo da Tabela ou Skeleton */}
        {isLoadingEmployees ? (
          <EmployeeTabSkeleton />
        ) : filteredEmployees.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-400">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base">Nenhum colaborador encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || roleFilter !== "ALL"
                ? "Tente ajustar seus termos de busca ou filtros para localizar os membros da equipe."
                : "Cadastre novos membros da equipe gerando links de convite na aba Convites."}
            </p>
          </div>
        ) : (
          <>
            {/* Visão Mobile (< 640px) */}
            <div className="sm:hidden space-y-3">
              {filteredEmployees.map((emp) => {
                const isExpanded = expandedId === emp.id;
                const scheduleName = schedules.find((s) => s.id === emp.workScheduleId)?.name;
                const initials = emp.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={emp.id}
                    className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] transition-colors"
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{emp.name}</p>
                          <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            emp.role === "ENTERPRISE_ADMIN"
                              ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Func."}
                        </span>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/10 pt-3 space-y-3 bg-white/50 dark:bg-white/[0.01]">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5 text-[10px]">Biometria</span>
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] inline-block ${emp.faceDescriptor ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"}`}>
                              {emp.faceDescriptor ? "Cadastrada" : "Pendente"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5 text-[10px]">Pontos em {selectedDate}</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{emp.checkins.length} registro(s)</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Escala de Trabalho</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleModalEmployee({ id: emp.id, name: emp.name, scheduleId: emp.workScheduleId });
                            }}
                            className="w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-white/10 rounded-xl transition-colors cursor-pointer text-xs"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {scheduleName ?? "Sem escala definida"}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">Alterar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Visão Desktop Table (>= 640px) */}
            <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/5 min-w-0">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 w-[30%]">Colaborador</th>
                    <th className="p-4 w-[16%]">Cargo</th>
                    <th className="p-4 w-[28%]">Escala de Trabalho</th>
                    <th className="p-4 w-[14%] text-center">Registros ({selectedDate})</th>
                    <th className="p-4 w-[12%] text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-sm text-slate-600 dark:text-slate-300">
                  {filteredEmployees.map((emp) => {
                    const scheduleName = schedules.find((s) => s.id === emp.workScheduleId)?.name;
                    const initials = emp.name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{emp.name}</p>
                              <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider inline-block ${
                              emp.role === "ENTERPRISE_ADMIN"
                                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => setScheduleModalEmployee({ id: emp.id, name: emp.name, scheduleId: emp.workScheduleId })}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-300 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                          >
                            <CalendarDays size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {scheduleName ?? "Definir Escala"}
                            </span>
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {emp.checkins.length}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => setScheduleModalEmployee({ id: emp.id, name: emp.name, scheduleId: emp.workScheduleId })}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de Atribuição e Criação de Escalas */}
      {scheduleModalEmployee && (
        <EmployeeScheduleModal
          employeeId={scheduleModalEmployee.id}
          employeeName={scheduleModalEmployee.name}
          currentScheduleId={scheduleModalEmployee.scheduleId}
          schedules={schedules}
          onClose={() => setScheduleModalEmployee(null)}
          onAssigned={() => {
            fetchEmployees();
            fetchSchedules();
          }}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCompany } from "../../hooks/useCompany";
import { EmployeeTabSkeleton } from "../../components/EmployeeTabSkeleton";
import { EmployeeScheduleModal } from "../../components/company/EmployeeScheduleModal";
import { PageHeader } from "../../components/common/PageHeader";
import type { EmployeeListItem, WorkScheduleResponse } from "../../services/api";
import { api } from "../../services/api";

export function FuncionariosPage() {
  const { isLoading } = useCompany();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<WorkScheduleResponse[]>([]);
  const [scheduleModalEmployee, setScheduleModalEmployee] = useState<{ id: string; name: string; scheduleId: string | null } | null>(null);

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

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Colaboradores"
        subtitle="Gerenciamento de funcionários e escalas de trabalho"
        helpText="Cadastre novos membros da equipe, edite dados cadastrais, gerencie permissões e visualize a lista completa de funcionários da empresa."
      />

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Funcionários da Empresa</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm font-medium"
            />
          </div>

          {isLoadingEmployees ? (
            <EmployeeTabSkeleton />
          ) : (
            <>
              {/* Mobile Accordion */}
              <div className="sm:hidden space-y-3">
                {employees.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum funcionário cadastrado</div>
                ) : (
                  employees.map((emp) => {
                    const isExpanded = expandedId === emp.id;
                    return (
                      <div key={emp.id} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-white">{emp.name}</span>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/10 pt-3 space-y-3">
                            <div>
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">E-mail</span>
                              <span className="text-sm text-slate-600 dark:text-slate-300">{emp.email}</span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Cargo</span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"}`}>
                                {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Biometria</span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.faceDescriptor ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"}`}>
                                {emp.faceDescriptor ? "Cadastrada" : "Pendente"}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Horário</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleModalEmployee({ id: emp.id, name: emp.name, scheduleId: emp.workScheduleId });
                                }}
                                className="text-left cursor-pointer hover:underline"
                              >
                                {emp.workScheduleId ? (
                                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                                    {schedules.find((s) => s.id === emp.workScheduleId)?.name ?? "Horário atribuído"}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400 dark:text-slate-500 italic">Sem horário</span>
                                )}
                              </button>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Check-ins ({selectedDate})</span>
                              <span className="text-sm text-slate-600 dark:text-slate-300">{emp.checkins.length} registro(s)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 w-[22%] min-w-[140px]">Nome</th>
                      <th className="p-4 w-[22%] min-w-[140px]">E-mail</th>
                      <th className="p-4 w-[10%] min-w-[90px]">Cargo</th>
                      <th className="p-4 w-[10%] min-w-[90px]">Biometria</th>
                      <th className="p-4 w-[14%] min-w-[110px]">Horário</th>
                      <th className="p-4 w-[8%] min-w-[80px]">Check-ins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-sm text-slate-600 dark:text-slate-300">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum funcionário cadastrado</td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-semibold text-slate-800 dark:text-white">{emp.name}</td>
                          <td className="p-4 text-slate-500 dark:text-slate-400">{emp.email}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"}`}>
                              {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.faceDescriptor ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"}`}>
                              {emp.faceDescriptor ? "Cadastrada" : "Pendente"}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setScheduleModalEmployee({ id: emp.id, name: emp.name, scheduleId: emp.workScheduleId })}
                              className="cursor-pointer hover:underline"
                            >
                              {emp.workScheduleId ? (
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                                  {schedules.find((s) => s.id === emp.workScheduleId)?.name ?? "Horário atribuído"}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic">Sem horário</span>
                              )}
                            </button>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{emp.checkins.length}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

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
    </div>
  );
}

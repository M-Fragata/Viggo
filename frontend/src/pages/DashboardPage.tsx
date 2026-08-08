import { useState, useEffect, useCallback } from "react";
import { useCompany, usePlanLimits } from "../hooks/useCompany";
import { useAuth, useCompanyStatus } from "../hooks/useAuth";
import { useCheckins } from "../hooks/useCheckins";
import { PlanBadge, PlanComparisonModal, UsageProgressBar, TrialCountdown } from "../components/plan";
import { InvitesTab, EmployeeScheduleModal, AssignScheduleModal } from "../components/company";
import { CheckinTable } from "../components/checkin/CheckinTable";
import { EmployeeTabSkeleton } from "../components/EmployeeTabSkeleton";
import { Users, CheckCircle, CreditCard, Mail, ArrowUpRight, Building2, ChevronDown, ChevronUp, FileText, Loader2, Download, Clock, ClipboardList } from "lucide-react";
import type { CompanyResponse, EmployeeListItem, WorkScheduleResponse } from "../services/api";
import { api } from "../services/api";
import { JustificativasContent } from "./JustificativasPage";

const TABS = ["Funcionários", "Presentes", "Folha Mensal", "Horários", "Plano", "Convites", "Justificativas"] as const;
type Tab = (typeof TABS)[number];

export function DashboardPage() {
  useAuth();
  const { company, isLoading } = useCompany();
  const { getPlanLimit, getPlanColor, getPlanLabel } = usePlanLimits();
  const { isTrialExpired, getTrialDaysRemaining } = useCompanyStatus();

  const [activeTab, setActiveTab] = useState<Tab>("Funcionários");
  const [showPlanModal, setShowPlanModal] = useState(false);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const planColor = plan ? getPlanColor(plan) : "gray";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:items-center bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de Controle</h1>
          <p className="text-xs sm:text-sm text-slate-400">Gerenciamento de frequência e auditoria biométrica</p>
        </div>
        <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl w-full sm:w-auto md:flex-row">
          <div className="flex gap-2">
            <Building2 className="text-emerald-600 shrink-0" size={20} />
            <span className="font-medium text-slate-700">{company?.name}</span>
          </div>
          <div className=" flex gap-2">
            <PlanBadge plan={plan!} size="sm" />
            <TrialCountdown planExpiresAt={company?.planExpiresAt ?? null} status={company?.status!} size="sm" />
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-2 bg-slate-100 p-1.5 rounded-2xl">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab === tab
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
              }`}
          >
            {tab === "Funcionários" && <Users size={18} className="shrink-0" />}
            {tab === "Presentes" && <CheckCircle size={18} className="shrink-0" />}
            {tab === "Folha Mensal" && <FileText size={18} className="shrink-0" />}
            {tab === "Horários" && <Clock size={18} className="shrink-0" />}
            {tab === "Plano" && <CreditCard size={18} className="shrink-0" />}
            {tab === "Convites" && <Mail size={18} className="shrink-0" />}
            {tab === "Justificativas" && <ClipboardList size={18} className="shrink-0" />}
            <span className="truncate">{tab}</span>
          </button>
        ))}
      </div>

      {activeTab === "Funcionários" && (
        <EmployeeTab company={company} planLimit={planLimit} />
      )}

      {activeTab === "Presentes" && (
        <PresentesTab />
      )}

      {activeTab === "Folha Mensal" && (
        <>
          <FolhaMensalTab />
          <AfdExportSection />
        </>
      )}

      {activeTab === "Horários" && (
        <WorkScheduleTab />
      )}

      {activeTab === "Plano" && (
        <PlanTab
          company={company}
          planLimit={planLimit}
          planColor={planColor}
          getPlanLabel={getPlanLabel}
          isTrialExpired={isTrialExpired(company?.planExpiresAt ?? null, company?.status!)}
          getTrialDaysRemaining={getTrialDaysRemaining}
          setShowPlanModal={setShowPlanModal}
        />
      )}

      {activeTab === "Convites" && (
        <InvitesTab />
      )}

      {activeTab === "Justificativas" && (
        <JustificativasContent />
      )}

      <PlanComparisonModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} currentPlan={plan!} />
    </div>
  );
}

function EmployeeTab({ company, planLimit }: {
  company: CompanyResponse | null;
  planLimit: {
    maxEmployees: number | null;
    price: number | null;
    api: {
      general: number;
      checkin: number;
      faceValidation: number;
    };
  } | null
}) {
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

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800">Funcionários da Empresa</h2>
          <div className="flex items-center gap-3">
            <UsageProgressBar
              current={company?.currentEmployees ?? 0}
              limit={planLimit?.maxEmployees ?? null}
              label="Total de funcionários"
              size="md"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          />
        </div>

        {isLoadingEmployees ? (
          <EmployeeTabSkeleton />
        ) : (
          <>
            <div className="sm:hidden space-y-3">
              {employees.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado</div>
              ) : (
                employees.map((emp) => {
                  const isExpanded = expandedId === emp.id;
                  return (
                    <div key={emp.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-semibold text-slate-800">{emp.name}</span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail</span>
                            <span className="text-sm text-slate-600">{emp.email}</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Cargo</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                              {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Biometria</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.faceDescriptor ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {emp.faceDescriptor ? "Cadastrada" : "Pendente"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Horário</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduleModalEmployee({ id: emp.id, name: emp.name, scheduleId: emp.workScheduleId });
                              }}
                              className="text-left cursor-pointer hover:underline"
                            >
                              {emp.workScheduleId ? (
                                <span className="text-sm font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                  {schedules.find((s) => s.id === emp.workScheduleId)?.name ?? "Horário atribuído"}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400 italic">Sem horário</span>
                              )}
                            </button>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Check-ins ({selectedDate})</span>
                            <span className="text-sm text-slate-600">{emp.checkins.length} registro(s)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 w-[22%] min-w-[140px]">Nome</th>
                    <th className="p-4 w-[22%] min-w-[140px]">E-mail</th>
                    <th className="p-4 w-[10%] min-w-[90px]">Cargo</th>
                    <th className="p-4 w-[10%] min-w-[90px]">Biometria</th>
                    <th className="p-4 w-[14%] min-w-[110px]">Horário</th>
                    <th className="p-4 w-[8%] min-w-[80px]">Check-ins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado</td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-semibold text-slate-800">{emp.name}</td>
                        <td className="p-4 text-slate-500">{emp.email}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                            {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.faceDescriptor ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {emp.faceDescriptor ? "Cadastrada" : "Pendente"}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setScheduleModalEmployee({ id: emp.id, name: emp.name, scheduleId: emp.workScheduleId })}
                            className="cursor-pointer hover:underline"
                          >
                            {emp.workScheduleId ? (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                {schedules.find((s) => s.id === emp.workScheduleId)?.name ?? "Horário atribuído"}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Sem horário</span>
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <span className="text-slate-700 font-medium">{emp.checkins.length}</span>
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
  );
}

function PresentesTab() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const { checkins, isLoading } = useCheckins(selectedDate);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">Presentes -         
          <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        /></h2>

      </div>
      <CheckinTable data={checkins} isLoading={isLoading} />
    </div>
  );
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function FolhaMensalTab() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const years: string[] = ["2026"];

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const blob = await api.checkins.exportRelatorioMensal(selectedYear, selectedMonth);
      if (!blob || blob.size === 0) {
        alert("Nenhum dado encontrado para este período.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RELATORIO_MENSAL_${selectedYear}${String(selectedMonth).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar relatório mensal:", error);
      alert(error instanceof Error ? error.message : "Erro ao gerar relatório mensal. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Relatório Mensal de Ponto (Art. 78 §5º-A)</h2>
          <p className="text-slate-500 text-sm">Exporta o relatório oficial MTE com hash SHA-256 de verificação</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isGenerating ? "Gerando..." : "Exportar Relatório"}
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <FileText className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-500 text-sm text-center">
          Selecione o mês e ano desejados e clique em <strong>"Exportar Relatório"</strong> para baixar o arquivo CSV com o relatório oficial de ponto.
        </p>
        <p className="text-slate-400 text-xs text-center mt-2">
          O arquivo inclui hash SHA-256 no rodapé para verificação de integridade conforme Art. 78 §5º-A da CLT.
        </p>
      </div>
    </div>
  );
}

function AfdExportSection() {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportAfd() {
    if (startDate > endDate) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await api.checkins.exportAfd(startDate, endDate);
      if (!blob || blob.size === 0) {
        alert("Nenhum registro encontrado para o período solicitado.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AFD_${startDate}_${endDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar AFD:", error);
      alert(error instanceof Error ? error.message : "Erro ao exportar AFD. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Exportar AFD — Arquivo Fonte de Dados (Art. 78 §5º)</h2>
          <p className="text-slate-500 text-sm">Gera o arquivo AFD no leiaute Anexo II da Portaria 671/2021 para auditoria do MTE</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Final</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          />
        </div>

        <button
          onClick={handleExportAfd}
          disabled={isExporting}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {isExporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isExporting ? "Gerando..." : "Exportar AFD"}
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <FileText className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-500 text-sm text-center">
          Selecione o período desejado e clique em <strong>"Exportar AFD"</strong> para baixar o arquivo no formato Anexo II da Portaria MTE nº 671/2021.
        </p>
        <p className="text-slate-400 text-xs text-center mt-2">
          O arquivo contém Header (Tipo 1), registros de detalhe (Tipo 2) e Trailer (Tipo 9), separados por pipe (|).
        </p>
      </div>
    </div>
  );
}

function WorkScheduleTab() {
  const [schedules, setSchedules] = useState<WorkScheduleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignModalSchedule, setAssignModalSchedule] = useState<WorkScheduleResponse | null>(null);
  const [form, setForm] = useState({
    name: "",
    entryTime: 480,
    lunchStart: 720,
    lunchEnd: 780,
    exitTime: 1020,
    daysOfWeek: 31,
    checkinToleranceMinutes: 5,
    lunchToleranceMinutes: 15,
  });

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.workSchedules.list();
      setSchedules(data);
    } catch {
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  function formatMinutes(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function formatDays(days: number): string {
    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    const bits = [1, 2, 4, 8, 16, 32, 64];
    return bits.map((b, i) => (days & b) ? labels[i] : null).filter(Boolean).join(", ");
  }

  async function handleSave() {
    try {
      if (editingId) {
        await api.workSchedules.update(editingId, form);
      } else {
        await api.workSchedules.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar horário");
    }
  }

  function resetForm() {
    setForm({ name: "", entryTime: 480, lunchStart: 720, lunchEnd: 780, exitTime: 1020, daysOfWeek: 31, checkinToleranceMinutes: 5, lunchToleranceMinutes: 15 });
  }

  function handleEdit(s: WorkScheduleResponse) {
    setForm({
      name: s.name,
      entryTime: s.entryTime,
      lunchStart: s.lunchStart,
      lunchEnd: s.lunchEnd,
      exitTime: s.exitTime,
      daysOfWeek: s.daysOfWeek,
      checkinToleranceMinutes: s.checkinToleranceMinutes,
      lunchToleranceMinutes: s.lunchToleranceMinutes,
    });
    setEditingId(s.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja remover este horário?")) return;
    try {
      await api.workSchedules.remove(id);
      fetchSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao remover horário");
    }
  }

  function toggleDay(bit: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek & bit ? prev.daysOfWeek & ~bit : prev.daysOfWeek | bit,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Horários de Trabalho</h2>
            <p className="text-slate-500 text-sm">Crie horários e atribua aos funcionários para aplicação de tolerância CLT</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }}
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm cursor-pointer"
          >
            {showForm ? "Cancelar" : "+ Novo Horário"}
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 space-y-4">
            <h3 className="font-bold text-slate-800">{editingId ? "Editar Horário" : "Novo Horário"}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Horário Comercial"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Entrada</label>
                <input type="time" value={formatMinutes(form.entryTime)}
                  onChange={(e) => setForm({ ...form, entryTime: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Saída</label>
                <input type="time" value={formatMinutes(form.exitTime)}
                  onChange={(e) => setForm({ ...form, exitTime: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Início Almoço</label>
                <input type="time" value={formatMinutes(form.lunchStart)}
                  onChange={(e) => setForm({ ...form, lunchStart: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fim Almoço</label>
                <input type="time" value={formatMinutes(form.lunchEnd)}
                  onChange={(e) => setForm({ ...form, lunchEnd: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tolerância Ponto (min)</label>
                <input type="number" min={0} max={60} value={form.checkinToleranceMinutes}
                  onChange={(e) => setForm({ ...form, checkinToleranceMinutes: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tolerância Almoço (min)</label>
                <input type="number" min={0} max={120} value={form.lunchToleranceMinutes}
                  onChange={(e) => setForm({ ...form, lunchToleranceMinutes: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 4, 8, 16, 32, 64].map((bit, i) => (
                  <button key={bit} type="button" onClick={() => toggleDay(bit)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      form.daysOfWeek & bit ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSave}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm cursor-pointer">
              {editingId ? "Salvar Alterações" : "Criar Horário"}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            Nenhum horário cadastrado. Clique em "+ Novo Horário" para criar.
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">{s.name}</h4>
                  <p className="text-sm text-slate-500">
                    {formatMinutes(s.entryTime)} – {formatMinutes(s.exitTime)} | Almoço: {formatMinutes(s.lunchStart)} – {formatMinutes(s.lunchEnd)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Dias: {formatDays(s.daysOfWeek)} | Tolerância: {s.checkinToleranceMinutes}min (ponto) / {s.lunchToleranceMinutes}min (almoço) |{" "}
                    <button
                      onClick={() => setAssignModalSchedule(s)}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
                    >
                      {s._count.users} funcionário(s)
                    </button>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(s)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer">
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {assignModalSchedule && (
        <AssignScheduleModal
          schedule={assignModalSchedule}
          onClose={() => setAssignModalSchedule(null)}
          onAssigned={() => {
            fetchSchedules();
          }}
        />
      )}
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
}: {
  company: CompanyResponse | null;
  planLimit: {
    maxEmployees: number | null;
    price: number | null;
    api: {
      general: number;
      checkin: number;
      faceValidation: number;
    };
  } | null;
  planColor: string;
  getPlanLabel: (plan: import("../services/api").PlanTier) => string;
  isTrialExpired: boolean;
  getTrialDaysRemaining: (planExpiresAt: string | null) => number;
  setShowPlanModal: (show: boolean) => void;
}) {
  const daysRemaining = company?.planExpiresAt ? getTrialDaysRemaining(company.planExpiresAt) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Plano Atual</h2>
            <p className="text-slate-500 text-sm">{getPlanLabel(company?.plan!)} - R$ {planLimit?.price?.toFixed(2)}/mês</p>
          </div>
          <PlanBadge plan={company?.plan!} size="lg" />
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

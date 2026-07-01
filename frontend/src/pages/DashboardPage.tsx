import { useState } from "react";
import { useCompany, usePlanLimits } from "../hooks/useCompany";
import { useAuth, useCompanyStatus } from "../hooks/useAuth";
import { useCheckins } from "../hooks/useCheckins";
import { PlanBadge, PlanComparisonModal, UsageProgressBar, TrialCountdown } from "../components/plan";
import { InvitesTab } from "../components/company";
import { CheckinTable } from "../components/checkin/CheckinTable";
import { EmployeeTabSkeleton } from "../components/EmployeeTabSkeleton";
import { Users, CheckCircle, CreditCard, Mail, ArrowUpRight, Building2, ChevronDown, ChevronUp, FileText, Loader2 } from "lucide-react";
import type { CompanyResponse, UsageResponse, User } from "../services/api";
import { api } from "../services/api";

const TABS = ["Funcionários", "Presentes", "Folha Mensal", "Plano", "Convites"] as const;
type Tab = (typeof TABS)[number];

export function DashboardPage() {
  useAuth();
  const { company, usage, isLoading } = useCompany();
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

      <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 p-1.5 rounded-2xl w-full overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${activeTab === tab
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
              }`}
          >
            {tab === "Funcionários" && <Users size={18} className="shrink-0" />}
            {tab === "Presentes" && <CheckCircle size={18} className="shrink-0" />}
            {tab === "Folha Mensal" && <FileText size={18} className="shrink-0" />}
            {tab === "Plano" && <CreditCard size={18} className="shrink-0" />}
            {tab === "Convites" && <Mail size={18} className="shrink-0" />}
            <span className="truncate">{tab}</span>
          </button>
        ))}
      </div>

      {activeTab === "Funcionários" && (
        <EmployeeTab company={company} usage={usage} planLimit={planLimit} />
      )}

      {activeTab === "Presentes" && (
        <PresentesTab />
      )}

      {activeTab === "Folha Mensal" && (
        <FolhaMensalTab company={company} />
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

      <PlanComparisonModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} currentPlan={plan!} />
    </div>
  );
}

function EmployeeTab({ company, usage, planLimit }: {
  company: CompanyResponse | null;
  usage: UsageResponse | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!usage) {
    return <EmployeeTabSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800">Funcionários da Empresa</h2>
          <UsageProgressBar
            current={company?.currentEmployees ?? 0}
            limit={planLimit?.maxEmployees ?? null}
            label="Total de funcionários"
            size="md"
          />
        </div>
        <div className="sm:hidden space-y-3">
          {usage?.employees?.current === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado</div>
          ) : (
            usage?.employees?.users?.map((emp: User) => {
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
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Ativo</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-[35%] min-w-[180px]">Nome</th>
                <th className="p-4 w-[35%] min-w-[180px]">E-mail</th>
                <th className="p-4 w-[15%] min-w-[120px]">Cargo</th>
                <th className="p-4 w-[15%] min-w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {usage?.employees?.current === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado</td>
                </tr>
              ) : (
                usage?.employees.users?.map((emp: User) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{emp.name}</td>
                    <td className="p-4 text-slate-500">{emp.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${emp.role === "ENTERPRISE_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                        }`}>
                        {emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Ativo</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function FolhaMensalTab({ company }: { company: CompanyResponse | null }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const years: string[] = ["2026"]

  function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const data = await api.checkins.listMonthly(selectedYear, selectedMonth);
      if (!data || data.length === 0) {
        alert("Nenhum funcionário encontrado para este período.");
        return;
      }

      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const monthEnd = new Date(selectedYear, selectedMonth, 0);
      const daysInMonth = monthEnd.getDate();

      const periodLabel = `${String(monthStart.getDate()).padStart(2, "0")}/${String(monthStart.getMonth() + 1).padStart(2, "0")}/${monthStart.getFullYear()} a ${String(monthEnd.getDate()).padStart(2, "0")}/${String(monthEnd.getMonth() + 1).padStart(2, "0")}/${monthEnd.getFullYear()}`;

      const companyName = company?.name ?? "";
      const companyCnpj = company?.cnpj ?? "";

      const pages = data.map((emp) => {
        const checkinsByDay: Record<number, { entry?: string; lunchStart?: string; lunchEnd?: string; exit?: string }> = {};

        for (const c of emp.checkins) {
          const date = new Date(c.createdAt);
          const day = date.getDate();
          if (!checkinsByDay[day]) checkinsByDay[day] = {};

          if (c.type === "ENTRY") checkinsByDay[day].entry = formatTime(c.createdAt);
          else if (c.type === "LUNCH_START") checkinsByDay[day].lunchStart = formatTime(c.createdAt);
          else if (c.type === "LUNCH_END") checkinsByDay[day].lunchEnd = formatTime(c.createdAt);
          else if (c.type === "EXIT") checkinsByDay[day].exit = formatTime(c.createdAt);
        }

        const rows = Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const date = new Date(selectedYear, selectedMonth - 1, dayNum);
          const dayName = WEEKDAYS[date.getDay()];
          const data = checkinsByDay[dayNum];

          return `
            <tr>
              <td style="padding:7px 5px;border:1px solid #ddd;text-align:center;font-size:9px;">${dayNum} | ${dayName}</td>
              <td style="padding:7px 5px;border:1px solid #ddd;text-align:center;font-size:9px;">${data?.entry ?? ""}</td>
              <td style="padding:7px 5px;border:1px solid #ddd;text-align:center;font-size:9px;">${data?.lunchStart ?? ""}</td>
              <td style="padding:7px 5px;border:1px solid #ddd;text-align:center;font-size:9px;">${data?.lunchEnd ?? ""}</td>
              <td style="padding:7px 5px;border:1px solid #ddd;text-align:center;font-size:9px;">${data?.exit ?? ""}</td>
              <td style="padding:7px 5px;border:1px solid #ddd;text-align:center;font-size:9px;"></td>
            </tr>`;
        }).join("");

        return `
          <div class="page">
            <div class="header">
              <div class="company-name">${escapeHtml(companyName)}</div>
              <div class="cnpj">CNPJ: ${escapeHtml(companyCnpj)}</div>
              <div class="period">Período: ${escapeHtml(periodLabel)}</div>
            </div>
            <div class="employee-name">Colaborador: ${escapeHtml(emp.employeeName)}</div>
            <table>
              <colgroup>
                <col style="width:55px;">
                <col style="width:28mm;">
                <col style="width:28mm;">
                <col style="width:28mm;">
                <col style="width:28mm;">
                <col>
              </colgroup>
              <thead>
                <tr>
                  <th style="padding:5px;border:1px solid #ddd;background:#f0f0f0;font-size:9px;">Dia</th>
                  <th style="padding:5px;border:1px solid #ddd;background:#f0f0f0;font-size:9px;">Entrada</th>
                  <th style="padding:5px;border:1px solid #ddd;background:#f0f0f0;font-size:9px;">Intervalo Saída</th>
                  <th style="padding:5px;border:1px solid #ddd;background:#f0f0f0;font-size:9px;">Intervalo Volta</th>
                  <th style="padding:5px;border:1px solid #ddd;background:#f0f0f0;font-size:9px;">Saída</th>
                  <th style="padding:5px;border:1px solid #ddd;background:#f0f0f0;font-size:9px;">Assinatura</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            <div class="signatures">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Assinatura do Funcionário</div>
                <div class="signature-name">${escapeHtml(emp.employeeName)}</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Assinatura do Responsável</div>
              </div>
            </div>
          </div>`;
      }).join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Folha Mensal - ${escapeHtml(companyName)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; }
    .page {
      width: 100%;
      padding: 10px 12px;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .header {
      border-bottom: 2px solid #10b981;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .company-name {
      font-size: 14px;
      font-weight: bold;
      color: #10b981;
    }
    .cnpj {
      font-size: 10px;
      color: #666;
      margin-top: 1px;
    }
    .period {
      font-size: 10px;
      color: #666;
      margin-top: 1px;
    }
    .employee-name {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #444;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      font-weight: bold;
      text-transform: uppercase;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding: 0 20px;
    }
    .signature-block {
      text-align: center;
      width: 40%;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      margin-bottom: 4px;
      height: 30px;
    }
    .signature-label {
      font-size: 9px;
      color: #666;
    }
    .signature-name {
      font-size: 9px;
      color: #333;
      font-weight: bold;
      margin-top: 2px;
    }
    @media print {
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  ${pages}
  <script>
    window.onload = () => {
      window.print();
    };
  </script>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Erro ao gerar folha mensal:", error);
      alert("Erro ao gerar folha mensal. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Folha Mensal</h2>
          <p className="text-slate-500 text-sm">Gere a folha de ponto mensal dos funcionários</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-6">
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
            <FileText size={18} />
          )}
          {isGenerating ? "Gerando..." : "Gerar Folha Mensal"}
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
        <FileText className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-500 text-sm">
          Selecione o mês e ano desejados e clique em <strong>"Gerar Folha Mensal"</strong> para criar o PDF com a folha de ponto de cada funcionário.
        </p>
      </div>
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

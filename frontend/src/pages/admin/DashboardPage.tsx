import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Users, CheckCircle, FileText, Clock, CreditCard, Mail, ClipboardList,
  ArrowRight, TrendingUp, AlertTriangle, UserCheck, Calendar,
} from "lucide-react";
import { useCompany, usePlanLimits } from "../../hooks/useCompany";
import { useCompanyStatus } from "../../hooks/useAuth";
import { useCheckins } from "../../hooks/useCheckins";
import { api } from "../../services/api";
import type { WorkScheduleResponse, JustificativaResponse, InviteTokenResponse } from "../../services/api";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";
import { UsageProgressBar } from "../../components/plan";

export function DashboardOverviewPage() {
  const { company, isLoading } = useCompany();
  const { getPlanLimit, getPlanColor, getPlanLabel } = usePlanLimits();
  const { isTrialExpired, getTrialDaysRemaining } = useCompanyStatus();

  const today = new Date().toISOString().split("T")[0];
  const { checkins } = useCheckins(today);

  const [schedules, setSchedules] = useState<WorkScheduleResponse[]>([]);
  const [justificativas, setJustificativas] = useState<(JustificativaResponse & { user?: { id: string; name: string; email: string } })[]>([]);
  const [invites, setInvites] = useState<InviteTokenResponse[]>([]);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const planColor = plan ? getPlanColor(plan) : "gray";
  const trialExpired = isTrialExpired(company?.planExpiresAt ?? null, company?.status ?? "ACTIVE");
  const trialDays = getTrialDaysRemaining(company?.planExpiresAt ?? null);

  const fetchOverviewData = useCallback(async () => {
    try {
      const [schedulesData, justificativasData, invitesData] = await Promise.all([
        api.workSchedules.list().catch(() => []),
        api.justificativa.list().catch(() => []),
        api.company.inviteTokens.list().catch(() => []),
      ]);
      setSchedules(schedulesData as WorkScheduleResponse[]);
      setJustificativas(justificativasData as (JustificativaResponse & { user?: { id: string; name: string; email: string } })[]);
      setInvites(invitesData as InviteTokenResponse[]);
    } catch {
      // silent
    }
  }, [today]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const presentesHoje = checkins.length;
  const justificativasPendentes = justificativas.filter((j) => j.aprovado === null).length;
  const convitesAtivos = invites.filter((i) => i.isActive && !i.revokedAt).length;
  const totalFuncionarios = company?.currentEmployees ?? 0;
  const percentPresente = totalFuncionarios > 0 ? Math.round((presentesHoje / totalFuncionarios) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />

      {/* Alertas de trial */}
      {company?.status === "TRIAL" && !trialExpired && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-800 text-sm">Trial ativo</h3>
            <p className="text-emerald-600 text-xs">{trialDays} dias restantes para decidir seu plano</p>
          </div>
        </div>
      )}
      {trialExpired && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-red-800 text-sm">Trial expirado</h3>
            <p className="text-red-600 text-xs">Ative seu plano para continuar usando o Viggo</p>
          </div>
          <Link to="/plano" className="ml-auto px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold text-xs cursor-pointer">
            Ativar plano
          </Link>
        </div>
      )}

      {/* Métricas principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Funcionários"
          value={totalFuncionarios}
          icon={<Users size={20} />}
          color="emerald"
          to="/funcionarios"
        />
        <MetricCard
          label="Presentes hoje"
          value={presentesHoje}
          icon={<UserCheck size={20} />}
          color="emerald"
          subtitle={`${percentPresente}% da equipe`}
          to="/presentes"
        />
        <MetricCard
          label="Justificativas pendentes"
          value={justificativasPendentes}
          icon={<ClipboardList size={20} />}
          color={justificativasPendentes > 0 ? "amber" : "slate"}
          to="/justificativas"
        />
        <MetricCard
          label="Convites ativos"
          value={convitesAtivos}
          icon={<Mail size={20} />}
          color="emerald"
          to="/convites"
        />
      </div>

      {/* Plano + Uso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Seu Plano</h2>
              <p className="text-slate-500 text-sm">{plan ? getPlanLabel(plan) : "-"}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${planColor}-100`}>
              <CreditCard className={`w-6 h-6 text-${planColor}-600`} />
            </div>
          </div>
          <UsageProgressBar
            current={company?.currentEmployees ?? 0}
            limit={planLimit?.maxEmployees ?? null}
            label="Funcionários"
            size="md"
          />
          <Link
            to="/plano"
            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm cursor-pointer"
          >
            Gerenciar plano
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Hoje</h2>
              <p className="text-slate-500 text-sm">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-100">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Presentes</span>
              <span className="font-bold text-emerald-600">{presentesHoje}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Ausentes</span>
              <span className="font-bold text-slate-700">{Math.max(0, totalFuncionarios - presentesHoje)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Horários cadastrados</span>
              <span className="font-bold text-slate-700">{schedules.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acesso rápido */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Acesso rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickLink to="/funcionarios" icon={<Users size={18} />} label="Funcionários" />
          <QuickLink to="/presentes" icon={<CheckCircle size={18} />} label="Presentes" />
          <QuickLink to="/folha-mensal" icon={<FileText size={18} />} label="Folha Mensal" />
          <QuickLink to="/horarios" icon={<Clock size={18} />} label="Horários" />
          <QuickLink to="/convites" icon={<Mail size={18} />} label="Convites" />
          <QuickLink to="/justificativas" icon={<ClipboardList size={18} />} label="Justificativas" />
          <QuickLink to="/plano" icon={<CreditCard size={18} />} label="Plano" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
  subtitle,
  to,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "emerald" | "amber" | "slate";
  subtitle?: string;
  to: string;
}) {
  const colorClasses = {
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Link
      to={to}
      className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </Link>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
    >
      <span className="text-slate-500 group-hover:text-emerald-600 transition-colors">{icon}</span>
      <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">{label}</span>
    </Link>
  );
}

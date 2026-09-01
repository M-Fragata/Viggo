import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Users, CheckCircle, FileText, Clock, CreditCard, Mail, ClipboardList,
  ArrowRight, AlertTriangle, UserCheck, Calendar,
} from "lucide-react";
import { useCompany, usePlanLimits } from "../../hooks/useCompany";
import { useCompanyStatus } from "../../hooks/useAuth";
import { useCheckins } from "../../hooks/useCheckins";
import { api } from "../../services/api";
import type { JustificativaResponse, InviteTokenResponse } from "../../services/api";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";
import { DashboardSkeleton } from "../../components/admin/DashboardSkeleton";
import { UsageProgressBar } from "../../components/plan";

export function DashboardOverviewPage() {
  const { company, isLoading } = useCompany();
  const { getPlanLimit, getPlanColor, getPlanLabel } = usePlanLimits();
  const { isTrialExpired, getTrialDaysRemaining } = useCompanyStatus();

  const today = new Date().toISOString().split("T")[0];
  const { checkins } = useCheckins(today);

  const [justificativas, setJustificativas] = useState<(JustificativaResponse & { user?: { id: string; name: string; email: string } })[]>([]);
  const [invites, setInvites] = useState<InviteTokenResponse[]>([]);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const planColor = plan ? getPlanColor(plan) : "gray";
  const trialExpired = isTrialExpired(company?.planExpiresAt ?? null, company?.status ?? "ACTIVE");
  const trialDays = getTrialDaysRemaining(company?.planExpiresAt ?? null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.justificativa.list().catch(() => []),
      api.company.inviteTokens.list().catch(() => []),
    ]).then(([justificativasData, invitesData]) => {
      if (isMounted) {
        setJustificativas(justificativasData as (JustificativaResponse & { user?: { id: string; name: string; email: string } })[]);
        setInvites(invitesData as InviteTokenResponse[]);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const presentesHoje = checkins.length;
  const justificativasPendentes = justificativas.filter((j) => j.aprovado === null).length;
  const convitesAtivos = invites.filter((i) => i.isActive && !i.revokedAt).length;
  const totalFuncionarios = company?.currentEmployees ?? 0;
  const percentPresente = totalFuncionarios > 0 ? Math.round((presentesHoje / totalFuncionarios) * 100) : 0;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />

      {/* Alertas de trial */}
      {company?.status === "TRIAL" && !trialExpired && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">Trial ativo</h3>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs">{trialDays} dias restantes para decidir seu plano</p>
          </div>
        </div>
      )}
      {trialExpired && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/60 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-red-800 dark:text-red-200 text-sm">Trial expirado</h3>
            <p className="text-red-600 dark:text-red-400 text-xs">Ative seu plano para continuar usando o Viggo</p>
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
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Seu Plano</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{plan ? getPlanLabel(plan) : "-"}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${planColor}-100 dark:bg-white/5`}>
              <CreditCard className={`w-6 h-6 text-${planColor}-600 dark:text-${planColor}-400`} />
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
            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-transparent dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-bold text-sm cursor-pointer"
          >
            Gerenciar Assinatura
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Links rápidos */}
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink to="/folha-mensal" icon={<FileText size={18} />} label="Folha Mensal" />
            <QuickLink to="/horarios" icon={<Clock size={18} />} label="Escalas" />
            <QuickLink to="/convites" icon={<Mail size={18} />} label="Convites" />
            <QuickLink to="/presentes" icon={<CheckCircle size={18} />} label="Presentes" />
          </div>
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
    emerald: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  };
  return (
    <Link
      to={to}
      className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-5 hover:shadow-md dark:hover:border-emerald-500/30 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
    </Link>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10 transition-all cursor-pointer group"
    >
      <span className="text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{icon}</span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">{label}</span>
    </Link>
  );
}

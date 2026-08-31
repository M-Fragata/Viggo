import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  CalendarCheck,
  Eye,
  Percent,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMasterMetrics } from "../hooks/useMaster";
import { useToast } from "../hooks/useToast";
import { MasterDashboardSkeleton } from "../components/master/MasterDashboardSkeleton";
import type { MasterRiskAlerts } from "../services/api";

type Range = 7 | 30 | 90;

function getRangeDates(range: Range) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (range - 1));
  // backend normaliza para 00:00-23:59, então enviar ISO date
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: `${range}d`,
  };
}

function formatDateShort(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return iso.slice(5, 10);
  }
}

export function MasterDashboard() {
  const { metrics, isLoading, error, fetchMetrics } = useMasterMetrics();
  const [range, setRange] = useState<Range>(30);

  const { from, to } = useMemo(() => getRangeDates(range), [range]);

  useEffect(() => {
    fetchMetrics({ from, to });
  }, [fetchMetrics, from, to]);

  const acquisition = metrics?.acquisition;
  const conversion = metrics?.conversion;
  const funnel = metrics?.funnel ?? [];

  const visits = acquisition?.views ?? 0;
  const uniques = acquisition?.uniques ?? 0;
  const companiesCreated = conversion?.companiesCreated ?? 0;
  const conversionRate = conversion?.rate ?? 0;
  const showAlert = visits > 500 && conversionRate < 1;

  // Chart data: merge byDay views/uniques + companies byDay (Hook must run unconditionally)
  const chartData = useMemo(() => {
    const byDayMap = new Map<string, { date: string; views: number; uniques: number; empresas: number }>();
    (acquisition?.byDay ?? []).forEach((d) => {
      byDayMap.set(d.date, { date: d.date, views: d.views, uniques: d.uniques, empresas: 0 });
    });
    (conversion?.byDay ?? []).forEach((d) => {
      const existing = byDayMap.get(d.date);
      if (existing) existing.empresas = d.count;
      else byDayMap.set(d.date, { date: d.date, views: 0, uniques: 0, empresas: d.count });
    });
    return Array.from(byDayMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, label: formatDateShort(d.date) }));
  }, [acquisition?.byDay, conversion?.byDay]);

  if (isLoading) {
    return <MasterDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-3">Erro ao carregar métricas: {error}</p>
        <button
          onClick={() => fetchMetrics({ from, to })}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const cardsLegacy = [
    { label: "Total de Empresas", value: metrics?.companies.total ?? 0, icon: Building2, color: "blue", change: null as number | null },
    { label: "Empresas Ativas", value: metrics?.companies.active ?? 0, icon: Building2, color: "emerald", change: null },
    { label: "Empresas em Trial", value: metrics?.companies.trial ?? 0, icon: Clock, color: "amber", change: null },
    { label: "Total de Usuários", value: metrics?.users.total ?? 0, icon: Users, color: "indigo", change: null },
    { label: "MRR", value: `R$ ${(metrics?.revenue.mrr ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "purple", change: null },
    { label: "Checkins este mês", value: metrics?.checkins.thisMonth ?? 0, icon: CalendarCheck, color: "teal", change: metrics?.checkins.growthRate ?? null },
  ];

  return (
    <div className="space-y-6 p-4 mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Master</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Visão geral de todas as empresas</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Período:</span>
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                range === r
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                  : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      {/* KPIs Aquisição — novo */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Aquisição & Conversão — {range} dias
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Visitas"
            value={visits}
            sub={`${uniques} únicas`}
            icon={Eye}
            color="emerald"
          />
          <KpiCard
            label="Empresas criadas"
            value={companiesCreated}
            sub="no período"
            icon={Building2}
            color="blue"
          />
          <KpiCard
            label="Taxa de conversão"
            value={`${conversionRate.toFixed(2)}%`}
            sub={`${companiesCreated}/${uniques || 0}`}
            icon={Percent}
            color={conversionRate >= 1 ? "emerald" : visits > 100 ? "amber" : "slate"}
            alert={showAlert ? "Ajustar landing — muitas visitas e baixa conversão" : undefined}
          />
          <KpiCard
            label="Trial ativos"
            value={metrics?.companies.trial ?? 0}
            sub={`${metrics?.companies.active ?? 0} ativas`}
            icon={FlaskConical}
            color="purple"
          />
        </div>
        {showAlert && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Mais de 500 visitas com conversão abaixo de 1% — considere revisar a landing page (CTA, proposta, prova social).</span>
          </div>
        )}
      </div>

      {/* Widget de Alertas de Risco & Customer Success Proativo */}
      <RiskAlertsSection riskAlerts={metrics?.riskAlerts} />

      {/* Funnel */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Funil</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Visita → CTA → Signup view → Empresa criada</p>
        {funnel.length === 0 || funnel.every((f) => f.count === 0) ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
            Sem dados no período — compartilhe a landing para começar a medir.
          </p>
        ) : (
          <div className="space-y-3">
            {funnel.map((step, idx) => {
              const prev = idx > 0 ? funnel[idx - 1].count : null;
              const dropoff = prev && prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : null;
              const max = Math.max(...funnel.map((f) => f.count), 1);
              const pct = Math.round((step.count / max) * 100);
              return (
                <div key={step.step} className="flex items-center gap-3">
                  <span className="w-32 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">{step.label}</span>
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-emerald-500 dark:bg-emerald-500 rounded-full transition-all duration-700 flex items-center justify-end pr-3"
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-xs font-bold text-white">{step.count}</span>
                    </div>
                  </div>
                  <span className="w-16 text-xs text-slate-500 dark:text-slate-400 text-right">
                    {dropoff !== null ? `-${dropoff}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gráfico linha dupla */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Visitas vs Empresas por dia</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">Sem dados para exibir no período.</p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#0ea5e9" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#10b981" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="views" name="Visitas" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="uniques" name="Únicas" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                <Line yAxisId="right" type="monotone" dataKey="empresas" name="Empresas" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabela origem */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Top origens</h2>
        {(acquisition?.bySource?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Nenhuma origem registrada no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                  <th className="text-left py-2 px-3 font-semibold">Origem (utm_source)</th>
                  <th className="text-right py-2 px-3 font-semibold">Visitas</th>
                  <th className="text-right py-2 px-3 font-semibold">Únicas</th>
                  <th className="text-right py-2 px-3 font-semibold">% do total</th>
                </tr>
              </thead>
              <tbody>
                {(acquisition?.bySource ?? []).map((row) => (
                  <tr key={row.utmSource} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100">{row.utmSource}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{row.views}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{row.uniques}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">
                      {visits > 0 ? `${Math.round((row.views / visits) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legado — métricas existentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardsLegacy.map((card, idx) => (
          <MetricCard key={idx} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Distribuição por Plano</h2>
          <div className="space-y-3">
            {Object.entries(metrics?.revenue.planDistribution ?? {}).map(([plan, count]) => (
              <PlanDistributionRow key={plan} plan={plan} count={count as number} total={metrics?.companies.total ?? 1} />
            ))}
            {Object.keys(metrics?.revenue.planDistribution ?? {}).length === 0 && (
              <p className="text-sm text-slate-400">Sem dados</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Churn & Crescimento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                <TrendingDown size={18} />
                <span className="font-semibold text-sm">Churn rate</span>
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{metrics?.churn.rate ?? 0}%</p>
              <p className="text-sm text-red-500 dark:text-red-300">{metrics?.churn.cancelled ?? 0} empresas canceladas</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                <TrendingUp size={18} />
                <span className="font-semibold text-sm">Crescimento checkins</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics?.checkins.growthRate ?? 0}%</p>
              <p className="text-sm text-emerald-500 dark:text-emerald-300">Mês anterior: {metrics?.checkins.lastMonth ?? 0} checkins</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/master/companies" className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium">
            Ver todas as empresas
          </Link>
          <Link to="/master/audit-logs" className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium">
            Consultar logs de auditoria
          </Link>
        </div>
      </div>
    </div>
  );
}

function RiskAlertsSection({ riskAlerts }: { riskAlerts?: MasterRiskAlerts }) {
  const [activeTab, setActiveTab] = useState<"onboarding" | "checkins" | "admins" | "trials" | "payments">("onboarding");
  const { toast } = useToast();

  const total = riskAlerts?.total ?? 0;
  const stalledOnboarding = riskAlerts?.stalledOnboarding?.list ?? [];
  const noRecentCheckins = riskAlerts?.noRecentCheckins?.list ?? [];
  const inactiveAdmins = riskAlerts?.inactiveAdmins?.list ?? [];
  const expiringTrials = riskAlerts?.expiringTrials?.list ?? [];
  const overduePayments = riskAlerts?.overduePayments?.list ?? [];

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("E-mail copiado!", { description: email });
  };

  return (
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Alertas de Risco & CS Proativo</h2>
              {total > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  {total} empresa{total > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gatilhos automáticos para onboarding e retenção (0 func 1d, sem ponto 3d, admin inativo 10d)
            </p>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="py-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
          <CheckCircle2 className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2" size={32} />
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Tudo em ordem!</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
            Nenhuma empresa em risco identificada no momento. Todas as contas estão ativas e com engajamento regular.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("onboarding")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "onboarding"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>🚨 Onboarding Travado (1d)</span>
              {stalledOnboarding.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/20 text-white">
                  {stalledOnboarding.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("checkins")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "checkins"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>⚠️ Sem Ponto (3d)</span>
              {noRecentCheckins.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/20 text-white">
                  {noRecentCheckins.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("admins")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "admins"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>⏱️ Admin Inativo (+10d)</span>
              {inactiveAdmins.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/20 text-white">
                  {inactiveAdmins.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("trials")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "trials"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>⏳ Trial Expirando (≤ 5d)</span>
              {expiringTrials.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/20 text-white">
                  {expiringTrials.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "payments"
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>💳 Inadimplência</span>
              {overduePayments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/20 text-white">
                  {overduePayments.length}
                </span>
              )}
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-100 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.01]">
            {activeTab === "onboarding" && (
              stalledOnboarding.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Nenhuma empresa com onboarding travado.</div>
              ) : (
                stalledOnboarding.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded font-semibold">
                          0 colaboradores
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Admin: <strong>{item.adminName || "N/A"}</strong> {item.adminEmail ? `(${item.adminEmail})` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.adminEmail && (
                        <button
                          onClick={() => copyEmail(item.adminEmail!)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 text-xs flex items-center gap-1 cursor-pointer"
                          title="Copiar E-mail"
                        >
                          <Copy size={13} />
                          <span className="hidden sm:inline text-[11px]">Copiar E-mail</span>
                        </button>
                      )}
                      <Link
                        to={`/master/companies/${item.id}`}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Acessar</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === "checkins" && (
              noRecentCheckins.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Nenhuma empresa ativa sem check-in nos últimos 3 dias.</div>
              ) : (
                noRecentCheckins.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded font-semibold">
                          {item.employeesCount} funcionário(s)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Nenhum registro de ponto registrado nas últimas 72 horas.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/master/companies/${item.id}`}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Ver Empresa</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === "admins" && (
              inactiveAdmins.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Nenhum administrador inativo há mais de 10 dias.</div>
              ) : (
                inactiveAdmins.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded font-semibold">
                          {item.daysSinceLogin ? `${item.daysSinceLogin}d sem login` : "Nunca logou"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Admin: {item.adminName || "N/A"} ({item.adminEmail || "Sem e-mail"})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.adminEmail && (
                        <button
                          onClick={() => copyEmail(item.adminEmail!)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={13} />
                          <span className="hidden sm:inline text-[11px]">Copiar E-mail</span>
                        </button>
                      )}
                      <Link
                        to={`/master/companies/${item.id}`}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Acessar</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === "trials" && (
              expiringTrials.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Nenhum trial expirando nos próximos 5 dias.</div>
              ) : (
                expiringTrials.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-bold">
                          {item.daysRemaining === 0 ? "Expira hoje!" : `Resta(m) ${item.daysRemaining} dia(s)`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Admin: {item.adminName || "N/A"} ({item.adminEmail || "Sem e-mail"})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/master/companies/${item.id}`}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Gerenciar Trial</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === "payments" && (
              overduePayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Nenhuma empresa com faturas em atraso.</div>
              ) : (
                overduePayments.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-bold">
                          {item.overdueCount} fatura(s) — R$ {Number(item.totalOverdueAmount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Admin: {item.adminName || "N/A"} ({item.adminEmail || "Sem e-mail"})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/master/companies/${item.id}`}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Ver Faturas</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color: string;
  alert?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800",
    slate: "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-white/10",
  };
  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${colorMap[color] ?? colorMap.slate}`}>
          <Icon size={20} />
        </div>
      </div>
      {alert && <p className="mt-3 text-xs text-amber-600 dark:text-amber-300 flex gap-1.5 items-start"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{alert}</p>}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, change }: { label: string; value: string | number; icon: LucideIcon; color: string; change: number | null | undefined }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800",
    teal: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800",
  };

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl border ${colorMap[color] ?? colorMap.blue}`}>
          <Icon size={24} />
        </div>
      </div>
      {change != null && (
        <div className={`mt-3 flex items-center gap-1 text-sm ${change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(change)}% vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

function PlanDistributionRow({ plan, count, total }: { plan: string; count: number; total: number }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const planStyles: Record<string, { bg: string; text: string; bar: string; label: string }> = {
    DYNAMIC: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "VG" },
    ENTERPRISE_CUSTOM: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", label: "ENT" },
  };
  const style = planStyles[plan] ?? { bg: "bg-slate-100 dark:bg-white/5", text: "text-slate-600 dark:text-slate-300", bar: "bg-slate-500", label: plan };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} ${style.text} text-sm font-bold`}>
        {style.label}
      </div>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${style.bar} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-16 text-right">{count}</span>
      <span className="text-sm text-slate-400 dark:text-slate-500 w-16">{percentage}%</span>
    </div>
  );
}

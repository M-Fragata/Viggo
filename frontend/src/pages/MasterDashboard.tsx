import { useEffect, useState, useMemo } from "react";
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
import { MasterDashboardSkeleton } from "../components/master/MasterDashboardSkeleton";

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

  const acquisition = metrics?.acquisition;
  const conversion = metrics?.conversion;
  const funnel = metrics?.funnel ?? [];

  const visits = acquisition?.views ?? 0;
  const uniques = acquisition?.uniques ?? 0;
  const companiesCreated = conversion?.companiesCreated ?? 0;
  const conversionRate = conversion?.rate ?? 0;
  const showAlert = visits > 500 && conversionRate < 1;

  // Chart data: merge byDay views/uniques + companies byDay
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
          <a href="/master/companies" className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium">
            Ver todas as empresas
          </a>
          <button className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm">
            Exportar relatório
          </button>
          <button className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm">
            Configurar alertas
          </button>
        </div>
      </div>
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
  icon: any;
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

function MetricCard({ label, value, icon: Icon, color, change }: { label: string; value: string | number; icon: any; color: string; change: number | null | undefined }) {
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

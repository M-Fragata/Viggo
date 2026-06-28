import { useEffect } from "react";
import { Building2, TrendingUp, TrendingDown, DollarSign, Clock, Users, CalendarCheck } from "lucide-react";
import { useMasterMetrics } from "../hooks/useMaster";

export function MasterDashboard() {
  const { metrics, isLoading, error, fetchMetrics } = useMasterMetrics();

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Erro ao carregar métricas: {error}
      </div>
    );
  }

  const cards = [
    {
      label: "Total de Empresas",
      value: metrics?.companies.total ?? 0,
      icon: Building2,
      color: "blue",
      change: null,
    },
    {
      label: "Empresas Ativas",
      value: metrics?.companies.active ?? 0,
      icon: Building2,
      color: "emerald",
      change: null,
    },
    {
      label: "Empresas em Trial",
      value: metrics?.companies.trial ?? 0,
      icon: Clock,
      color: "amber",
      change: null,
    },
    {
      label: "Total de Usuários",
      value: metrics?.users.total ?? 0,
      icon: Users,
      color: "indigo",
      change: null,
    },
    {
      label: "MRR",
      value: `R$ ${(metrics?.revenue.mrr ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "purple",
      change: null,
    },
    {
      label: "Checkins este mês",
      value: metrics?.checkins.thisMonth ?? 0,
      icon: CalendarCheck,
      color: "teal",
      change: metrics?.checkins.growthRate,
    },
  ];

  return (
    <div className="space-y-6 p-4 mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Master</h1>
          <p className="text-slate-500 text-sm">Visão geral de todas as empresas</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <MetricCard key={idx} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Distribuição por Plano</h2>
          <div className="space-y-3">
            {Object.entries(metrics?.revenue.planDistribution ?? {}).map(([plan, count]) => (
              <PlanDistributionRow key={plan} plan={plan} count={count as number} total={metrics?.companies.total ?? 1} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Churn & Crescimento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <TrendingDown size={18} />
                <span className="font-semibold">Churn rate</span>
              </div>
              <p className="text-3xl font-bold text-red-600">{metrics?.churn.rate ?? 0}%</p>
              <p className="text-sm text-red-500">{metrics?.churn.cancelled ?? 0} empresas canceladas</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <TrendingUp size={18} />
                <span className="font-semibold">Crescimento checkins</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{metrics?.checkins.growthRate ?? 0}%</p>
              <p className="text-sm text-emerald-500">Mês anterior: {metrics?.checkins.lastMonth ?? 0} checkins</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/master/companies" className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
            Ver todas as empresas
          </a>
          <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
            Exportar relatório
          </button>
          <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
            Configurar alertas
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, change }: { label: string; value: string | number; icon: any; color: string; change: number | null | undefined }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-3xl shadow-sm p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color] ?? colorMap.blue}`}>
          <Icon size={24} />
        </div>
      </div>
      {change != null && (
        <div className={`mt-3 flex items-center gap-1 text-sm ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
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
    TIER_I: { bg: "bg-emerald-100", text: "text-emerald-600", bar: "bg-emerald-500", label: "T1" },
    TIER_II: { bg: "bg-blue-100", text: "text-blue-600", bar: "bg-blue-500", label: "T2" },
    TIER_III: { bg: "bg-purple-100", text: "text-purple-600", bar: "bg-purple-500", label: "T3" },
    ENTERPRISE_CUSTOM: { bg: "bg-amber-100", text: "text-amber-600", bar: "bg-amber-500", label: "ENT" },
  };
  const style = planStyles[plan] ?? { bg: "bg-slate-100", text: "text-slate-600", bar: "bg-slate-500", label: plan };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} ${style.text} text-sm font-bold`}>
        {style.label}
      </div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${style.bar} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-600 w-16 text-right">{count}</span>
      <span className="text-sm text-slate-400 w-16">{percentage}%</span>
    </div>
  );
}
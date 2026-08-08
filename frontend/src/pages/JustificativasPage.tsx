import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type {
  JustificativaResponse,
  JustificativaTipo,
  JustificativaCreateBody,
} from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  FileText,
  Plus,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Clock,
  Calendar,
  Filter,
} from "lucide-react";

type JustificativaWithUser = JustificativaResponse & {
  user?: { id: string; name: string; email: string };
};

const TIPO_LABELS: Record<JustificativaTipo, string> = {
  ABONO: "Abono",
  FALTA: "Falta",
  ATESTADO: "Atestado Médico",
  JUSTIFICATIVA_GERAL: "Justificativa Geral",
};

const TIPO_COLORS: Record<JustificativaTipo, string> = {
  ABONO: "bg-blue-100 text-blue-700",
  FALTA: "bg-red-100 text-red-700",
  ATESTADO: "bg-amber-100 text-amber-700",
  JUSTIFICATIVA_GERAL: "bg-slate-100 text-slate-700",
};

export function JustificativasPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <JustificativasContent />
    </div>
  );
}

export function JustificativasContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ENTERPRISE_ADMIN" || user?.role === "MASTER";

  const [justificativas, setJustificativas] = useState<JustificativaWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"TODOS" | "PENDENTE" | "APROVADO" | "REJEITADO">("TODOS");

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    tipo: JustificativaTipo;
    descricao: string;
    dataInicio: string;
    dataFim: string;
  }>({
    tipo: "JUSTIFICATIVA_GERAL",
    descricao: "",
    dataInicio: new Date().toISOString().split("T")[0],
    dataFim: "",
  });

  const [actionPending, setActionPending] = useState<string | null>(null);

  const loadJustificativas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.justificativa.list();
      setJustificativas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar justificativas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJustificativas();
  }, [loadJustificativas]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (formData.descricao.trim().length < 10) {
      setFormError("A descrição deve ter no mínimo 10 caracteres.");
      return;
    }

    const body: JustificativaCreateBody = {
      tipo: formData.tipo,
      descricao: formData.descricao.trim(),
      dataInicio: formData.dataInicio,
    };
    if (formData.dataFim) {
      body.dataFim = formData.dataFim;
    }

    setIsSubmitting(true);
    try {
      await api.justificativa.create(body);
      setShowForm(false);
      setFormData({
        tipo: "JUSTIFICATIVA_GERAL",
        descricao: "",
        dataInicio: new Date().toISOString().split("T")[0],
        dataFim: "",
      });
      await loadJustificativas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao registrar justificativa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAprovar(id: string, aprovado: boolean) {
    setActionPending(id);
    try {
      await api.justificativa.approve(id, aprovado);
      await loadJustificativas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar aprovação.");
    } finally {
      setActionPending(null);
    }
  }

  const filteredJustificativas = justificativas.filter((j) => {
    if (filterStatus === "TODOS") return true;
    if (filterStatus === "PENDENTE") return j.aprovado === null;
    if (filterStatus === "APROVADO") return j.aprovado === true;
    if (filterStatus === "REJEITADO") return j.aprovado === false;
    return true;
  });

  const stats = {
    total: justificativas.length,
    pendentes: justificativas.filter((j) => j.aprovado === null).length,
    aprovadas: justificativas.filter((j) => j.aprovado === true).length,
    rejeitadas: justificativas.filter((j) => j.aprovado === false).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={loadJustificativas}
          className="mt-4 px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold text-sm cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <header className="flex flex-col gap-2 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              {isAdmin ? "Justificativas da Empresa" : "Minhas Justificativas"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {isAdmin
                ? "Gerencie e aprove justificativas de ausência dos funcionários"
                : "Registre justificativas de ausência ou omissão de ponto"}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap"
            >
              <Plus size={18} />
              Nova Justificativa
            </button>
          )}
        </div>
      </header>

      {/* FORM DE CRIAR (EMPLOYEE) */}
      {showForm && !isAdmin && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Plus className="text-emerald-600" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Nova Justificativa</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as JustificativaTipo })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none cursor-pointer"
                >
                  {Object.entries(TIPO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataInicio}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={formData.dataFim}
                    onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Descrição
              </label>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={4}
                placeholder="Descreva o motivo da ausência ou omissão (mínimo 10 caracteres)..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">
                {formData.descricao.length}/500 caracteres
              </p>
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                {formError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {isSubmitting ? "Enviando..." : "Registrar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-bold disabled:opacity-50 cursor-pointer text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ESTATÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color="bg-slate-100 text-slate-700" icon={<FileText size={16} />} />
        <StatCard label="Pendentes" value={stats.pendentes} color="bg-amber-100 text-amber-700" icon={<Clock size={16} />} />
        <StatCard label="Aprovadas" value={stats.aprovadas} color="bg-emerald-100 text-emerald-700" icon={<Check size={16} />} />
        <StatCard label="Rejeitadas" value={stats.rejeitadas} color="bg-red-100 text-red-700" icon={<X size={16} />} />
      </div>

      {/* FILTRO (ADMIN) */}
      {isAdmin && (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3">
          <Filter size={18} className="text-slate-400 shrink-0" />
          <div className="flex flex-wrap gap-2">
            {(["TODOS", "PENDENTE", "APROVADO", "REJEITADO"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === status
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LISTA DE JUSTIFICATIVAS */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="text-blue-600" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            {isAdmin ? "Todas as Justificativas" : "Histórico"}
          </h2>
          <span className="ml-auto text-sm text-slate-400">
            {filteredJustificativas.length} {filteredJustificativas.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {filteredJustificativas.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">
              {filterStatus !== "TODOS"
                ? `Nenhuma justificativa com status "${filterStatus}".`
                : "Nenhuma justificativa registrada."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJustificativas.map((j) => (
              <JustificativaCard
                key={j.id}
                justificativa={j}
                isAdmin={isAdmin}
                actionPending={actionPending === j.id}
                onAprovar={handleAprovar}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function JustificativaCard({
  justificativa: j,
  isAdmin,
  actionPending,
  onAprovar,
}: {
  justificativa: JustificativaWithUser;
  isAdmin: boolean;
  actionPending: boolean;
  onAprovar: (id: string, aprovado: boolean) => void;
}) {
  const isPendente = j.aprovado === null;
  const isAprovado = j.aprovado === true;

  return (
    <div className="border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIPO_COLORS[j.tipo]}`}>
              {TIPO_LABELS[j.tipo]}
            </span>
            {isAdmin && j.user && (
              <span className="text-sm text-slate-600 font-medium">
                {j.user.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(j.dataInicio)}
              {j.dataFim && ` → ${formatDate(j.dataFim)}`}
            </span>
            <span>Registrada em {formatDate(j.createdAt)}</span>
          </div>
        </div>
        <StatusBadge aprovado={j.aprovado} />
      </div>

      <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3">
        {j.descricao}
      </p>

      {isAdmin && isPendente && (
        <div className="flex gap-3">
          <button
            onClick={() => onAprovar(j.id, true)}
            disabled={actionPending}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
          >
            {actionPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Aprovar
          </button>
          <button
            onClick={() => onAprovar(j.id, false)}
            disabled={actionPending}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
          >
            {actionPending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
            Rejeitar
          </button>
        </div>
      )}

      {isAdmin && !isPendente && j.aprovadoPor && (
        <p className="text-xs text-slate-400 mt-2">
          {isAprovado ? "Aprovada" : "Rejeitada"} em {formatDate(j.updatedAt)}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ aprovado }: { aprovado: boolean | null }) {
  if (aprovado === null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">
        Pendente
      </span>
    );
  }
  if (aprovado === true) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">
        Aprovada
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
      Rejeitada
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

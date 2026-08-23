import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type {
  JustificativaResponse,
  JustificativaTipo,
  JustificativaCreateBody,
  CheckinResponse,
} from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { PageHeader } from "../components/common/PageHeader";
import { JustificativasSkeleton } from "../components/justificativas/JustificativasSkeleton";
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
  LogIn,
  Utensils,
  Coffee,
  LogOut,
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
  ABONO: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  FALTA: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  ATESTADO: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  JUSTIFICATIVA_GERAL: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300",
};

function getCheckinIcon(type: string) {
  switch (type) {
    case "ENTRY":
      return <LogIn size={16} className="text-emerald-600 dark:text-emerald-400" />;
    case "LUNCH_START":
      return <Utensils size={16} className="text-emerald-600 dark:text-emerald-400" />;
    case "LUNCH_END":
      return <Coffee size={16} className="text-emerald-600 dark:text-emerald-400" />;
    case "EXIT":
      return <LogOut size={16} className="text-red-500 dark:text-red-400" />;
    default:
      return <Clock size={16} className="text-slate-600 dark:text-slate-400" />;
  }
}

function getCheckinLabel(type: string): string {
  switch (type) {
    case "ENTRY":
      return "Entrada";
    case "LUNCH_START":
      return "Início Almoço";
    case "LUNCH_END":
      return "Retorno Almoço";
    case "EXIT":
      return "Saída";
    default:
      return type;
  }
}

export function JustificativasPage() {
  return (
    <div className="w-full space-y-6">
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
    checkinId: string | null;
  }>({
    tipo: "JUSTIFICATIVA_GERAL",
    descricao: "",
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: "",
    checkinId: null,
  });

  const [checkinsForDate, setCheckinsForDate] = useState<CheckinResponse[]>([]);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const loadJustificativas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.justificativa.list();
      setJustificativas(data as JustificativaWithUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar justificativas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJustificativas();
  }, [loadJustificativas]);

  const loadCheckinsForDate = useCallback(async (dateStr: string) => {
    if (!dateStr) return;
    setIsLoadingCheckins(true);
    try {
      const data = await api.checkins.list(dateStr);
      setCheckinsForDate(data);
    } catch {
      setCheckinsForDate([]);
    } finally {
      setIsLoadingCheckins(false);
    }
  }, []);

  useEffect(() => {
    if (showForm && !isAdmin && formData.dataInicio) {
      loadCheckinsForDate(formData.dataInicio);
    }
  }, [showForm, isAdmin, formData.dataInicio, loadCheckinsForDate]);

  function handleDateChange(newDate: string) {
    setFormData((prev) => ({
      ...prev,
      dataInicio: newDate,
      checkinId: null,
    }));
    loadCheckinsForDate(newDate);
  }

  function handleSelectCheckin(checkinId: string | null) {
    setFormData((prev) => ({
      ...prev,
      checkinId: prev.checkinId === checkinId ? null : checkinId,
    }));
  }

  function resetForm() {
    setFormData({
      tipo: "JUSTIFICATIVA_GERAL",
      descricao: "",
      dataInicio: new Date().toISOString().slice(0, 10),
      dataFim: "",
      checkinId: null,
    });
    setCheckinsForDate([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (formData.descricao.trim().length < 10) {
      setFormError("A descrição deve ter no mínimo 10 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: JustificativaCreateBody = {
        tipo: formData.tipo,
        descricao: formData.descricao.trim(),
        dataInicio: new Date(formData.dataInicio + "T00:00:00.000Z").toISOString(),
        dataFim: formData.dataFim
          ? new Date(formData.dataFim + "T23:59:59.999Z").toISOString()
          : undefined,
        checkinId: formData.checkinId ?? undefined,
      };

      await api.justificativa.create(payload);
      setShowForm(false);
      resetForm();
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
    return <JustificativasSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-6 text-center">
        <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
        <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
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
      <PageHeader
        title={isAdmin ? "Gestão de Justificativas" : "Minhas Justificativas"}
        subtitle={
          isAdmin
            ? "Gerencie e aprove justificativas de ausência e atestados dos funcionários"
            : "Registre justificativas de ausência, faltas ou atestados médicos"
        }
        helpText={
          isAdmin
            ? "Analise, aprove ou recuse pedidos de abono de faltas, atrasos e atestados médicos enviados pelos colaboradores com anexo."
            : "Envie atestados médicos ou justificativas de ausência e acompanhe o status de aprovação pelo seu gestor."
        }
        actions={
          !isAdmin ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap"
            >
              <Plus size={18} />
              Nova Justificativa
            </button>
          ) : undefined
        }
      />

      {/* FORM DE CRIAR (EMPLOYEE) */}
      {showForm && !isAdmin && (
        <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl flex items-center justify-center">
              <Plus className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Nova Justificativa</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as JustificativaTipo })}
                  className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm text-slate-700 dark:text-white bg-white dark:bg-white/5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none cursor-pointer"
                >
                  {Object.entries(TIPO_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataInicio}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm text-slate-700 dark:text-white bg-white dark:bg-white/5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={formData.dataFim}
                    onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                    className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm text-slate-700 dark:text-white bg-white dark:bg-white/5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Seleção de Check-in */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Ponto a Justificar
              </label>
              {isLoadingCheckins ? (
                <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Carregando pontos...</span>
                </div>
              ) : checkinsForDate.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Nenhum ponto registrado neste dia</span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Você pode criar uma justificativa de ausência/falta para este dia.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectCheckin(null)}
                    className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      formData.checkinId === null
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                    }`}
                  >
                    Justificar ausência
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCheckin(null)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      formData.checkinId === null
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                        : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.checkinId === null ? "border-amber-500" : "border-slate-300 dark:border-slate-600"
                    }`}>
                      {formData.checkinId === null && (
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Justificar ausência/falta</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 block">Sem check-in específico</span>
                    </div>
                  </button>

                  {checkinsForDate.map((checkin) => {
                    const checkinTime = new Date(checkin.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const isSelected = formData.checkinId === checkin.id;
                    const icon = getCheckinIcon(checkin.type);
                    const label = getCheckinLabel(checkin.type);

                    return (
                      <button
                        key={checkin.id}
                        type="button"
                        onClick={() => handleSelectCheckin(checkin.id)}
                        className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-emerald-500" : "border-slate-300 dark:border-slate-600"
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-slate-100 dark:bg-white/5"
                        }`}>
                          {icon}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 block">Registrado às {checkinTime}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
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
                className="w-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl p-3 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {formData.descricao.length}/500 caracteres
              </p>
            </div>
            {formError && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
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
                  resetForm();
                }}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors font-bold disabled:opacity-50 cursor-pointer text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ESTATÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300" icon={<FileText size={16} />} />
        <StatCard label="Pendentes" value={stats.pendentes} color="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" icon={<Clock size={16} />} />
        <StatCard label="Aprovadas" value={stats.aprovadas} color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" icon={<Check size={16} />} />
        <StatCard label="Rejeitadas" value={stats.rejeitadas} color="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" icon={<X size={16} />} />
      </div>

      {/* FILTRO (ADMIN) */}
      {isAdmin && (
        <div className="flex items-center gap-3 bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-3 transition-colors">
          <Filter size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <div className="flex flex-wrap gap-2">
            {(["TODOS", "PENDENTE", "APROVADO", "REJEITADO"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === status
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LISTA DE JUSTIFICATIVAS */}
      <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/60 rounded-xl flex items-center justify-center">
            <FileText className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {isAdmin ? "Todas as Justificativas" : "Histórico"}
          </h2>
          <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
            {filteredJustificativas.length} {filteredJustificativas.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {filteredJustificativas.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
            <p className="text-slate-400 dark:text-slate-500 text-sm">
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
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-700 dark:text-white">{value}</p>
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
    <div className="border border-slate-100 dark:border-white/10 rounded-2xl p-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors bg-slate-50/30 dark:bg-white/[0.01]">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIPO_COLORS[j.tipo]}`}>
              {TIPO_LABELS[j.tipo]}
            </span>
            {isAdmin && j.user && (
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {j.user.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
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

      <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-3 mb-3">
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
            className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
          >
            {actionPending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
            Rejeitar
          </button>
        </div>
      )}

      {isAdmin && !isPendente && j.aprovadoPor && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {isAprovado ? "Aprovada" : "Rejeitada"} em {formatDate(j.updatedAt)}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ aprovado }: { aprovado: boolean | null }) {
  if (aprovado === null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 whitespace-nowrap">
        Pendente
      </span>
    );
  }
  if (aprovado === true) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
        Aprovada
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 whitespace-nowrap">
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

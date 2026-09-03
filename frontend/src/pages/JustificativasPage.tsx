import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import type {
  JustificativaResponse,
  JustificativaTipo,
  JustificativaCreateBody,
  JustificativaArquivoDto,
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
  UploadCloud,
  Eye,
  MessageSquareWarning,
  Paperclip,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const TIPO_LABELS: Record<JustificativaTipo, string> = {
  ESQUECIMENTO_PONTO: "Esquecimento de Ponto (Ajuste)",
  ATESTADO_MEDICO: "Atestado Médico / Odontológico",
  DECLARACAO_COMPARECIMENTO: "Declaração de Comparecimento",
  ABONO_FALTA: "Abono de Falta / Ausência",
  OUTRO: "Outra Justificativa",
  ABONO: "Abono (Legado)",
  FALTA: "Falta (Legado)",
  ATESTADO: "Atestado (Legado)",
  JUSTIFICATIVA_GERAL: "Geral (Legado)",
};

const TIPO_COLORS: Record<JustificativaTipo, string> = {
  ESQUECIMENTO_PONTO: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  ATESTADO_MEDICO: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  DECLARACAO_COMPARECIMENTO: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
  ABONO_FALTA: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  OUTRO: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300",
  ABONO: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  FALTA: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  ATESTADO: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  JUSTIFICATIVA_GERAL: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300",
};

const LIMITE_ARQUIVO_BYTES = 4 * 1024 * 1024; // 4 MB

export function JustificativasPage() {
  return (
    <div className="w-full space-y-6 min-w-0">
      <JustificativasContent />
    </div>
  );
}

export function JustificativasContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ENTERPRISE_ADMIN" || user?.role === "MASTER";

  const [justificativas, setJustificativas] = useState<JustificativaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"TODOS" | "PENDENTE" | "APROVADO" | "REJEITADO">("TODOS");

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    tipo: JustificativaTipo;
    descricao: string;
    dataInicio: string;
    dataFim: string;
    horarioAjustado: string;
    tipoBatidaAjuste: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
    diasAfastamento: number;
    arquivo?: JustificativaArquivoDto;
  }>({
    tipo: "ESQUECIMENTO_PONTO",
    descricao: "",
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: "",
    horarioAjustado: "08:00",
    tipoBatidaAjuste: "ENTRY",
    diasAfastamento: 1,
  });

  const [arquivoPreview, setArquivoPreview] = useState<{
    nome: string;
    tamanhoFormatado: string;
    isPdf: boolean;
    previewUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Recusa com Motivo (Admin)
  const [modalRecusaId, setModalRecusaId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Modal de Visualização de Anexo
  const [visualizarAnexoUrl, setVisualizarAnexoUrl] = useState<string | null>(null);
  const [visualizarAnexoNome, setVisualizarAnexoNome] = useState<string>("");

  async function carregarJustificativas() {
    try {
      setIsLoading(true);
      const data = await api.justificativa.list();
      setJustificativas(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar solicitações.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    api.justificativa
      .list()
      .then((data) => {
        if (ativo) {
          setJustificativas(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (ativo) {
          setError(err instanceof Error ? err.message : "Erro ao carregar solicitações.");
        }
      })
      .finally(() => {
        if (ativo) setIsLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > LIMITE_ARQUIVO_BYTES) {
      toast.error(`O arquivo excede o limite máximo permitido de 4 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const mime = file.type || "application/octet-stream";
    const isPdf = mime === "application/pdf";
    const tamanhoKb = Math.round(file.size / 1024);
    const tamanhoFormatado = tamanhoKb > 1024 ? `${(tamanhoKb / 1024).toFixed(1)} MB` : `${tamanhoKb} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        arquivo: {
          nomeOriginal: file.name,
          mimeType: mime,
          conteudoBase64: base64,
        },
      }));

      setArquivoPreview({
        nome: file.name,
        tamanhoFormatado,
        isPdf,
        previewUrl: !isPdf ? base64 : undefined,
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRemoverArquivo() {
    setFormData((prev) => ({ ...prev, arquivo: undefined }));
    setArquivoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetForm() {
    setFormData({
      tipo: "ESQUECIMENTO_PONTO",
      descricao: "",
      dataInicio: new Date().toISOString().slice(0, 10),
      dataFim: "",
      horarioAjustado: "08:00",
      tipoBatidaAjuste: "ENTRY",
      diasAfastamento: 1,
    });
    handleRemoverArquivo();
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (formData.descricao.trim().length < 5) {
      setFormError("A descrição deve conter no mínimo 5 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: JustificativaCreateBody = {
        tipo: formData.tipo,
        descricao: formData.descricao.trim(),
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim || undefined,
        horarioAjustado: formData.tipo === "ESQUECIMENTO_PONTO" ? formData.horarioAjustado : undefined,
        tipoBatidaAjuste: formData.tipo === "ESQUECIMENTO_PONTO" ? formData.tipoBatidaAjuste : undefined,
        diasAfastamento: formData.tipo === "ATESTADO_MEDICO" ? formData.diasAfastamento : undefined,
        arquivo: formData.arquivo,
      };

      const res = await api.justificativa.create(payload);
      toast.success(res.message || "Solicitação registrada com sucesso!");
      setShowForm(false);
      resetForm();
      await carregarJustificativas();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar solicitação.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAprovar(id: string) {
    setActionPending(id);
    try {
      const res = await api.justificativa.approve(id, true);
      toast.success(res.message || "Solicitação aprovada!");
      await carregarJustificativas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar aprovação.");
    } finally {
      setActionPending(null);
    }
  }

  async function handleConfirmarRecusa() {
    if (!modalRecusaId) return;
    if (motivoRecusa.trim().length < 5) {
      toast.error("Informe o motivo da recusa para orientar o colaborador (mínimo de 5 caracteres).");
      return;
    }

    setActionPending(modalRecusaId);
    try {
      const res = await api.justificativa.approve(modalRecusaId, false, motivoRecusa.trim());
      toast.success(res.message || "Solicitação recusada com sucesso.");
      setModalRecusaId(null);
      setMotivoRecusa("");
      await carregarJustificativas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao recusar solicitação.");
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
          onClick={carregarJustificativas}
          className="mt-4 px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold text-sm cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? "Gestão de Justificativas e Ajustes" : "Minhas Justificativas e Ajustes"}
        subtitle={
          isAdmin
            ? "Analise solicitações de esquecimento de ponto, atestados médicos e declarações dos colaboradores"
            : "Solicite ajustes de horários esquecidos e envie atestados médicos com foto (máx 4 MB)"
        }
        helpText={
          isAdmin
            ? "Ao aprovar um esquecimento de ponto, o horário é automaticamente registrado no espelho do colaborador com a devida auditoria exigida pela Portaria 671/2021 MTE."
            : "Esqueceu de registrar a entrada ou saída? Anexe seu atestado médico ou informe o horário que trabalhou para análise do RH."
        }
        actions={
          !isAdmin ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap shadow-sm shadow-emerald-600/30"
            >
              <Plus size={18} />
              {showForm ? "Fechar Formulário" : "Nova Solicitação"}
            </button>
          ) : undefined
        }
      />

      {/* FORMULÁRIO DE SOLICITAÇÃO (COLABORADOR) */}
      {showForm && !isAdmin && (
        <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl flex items-center justify-center">
              <Plus className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Nova Solicitação de Ajuste ou Atestado
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preencha os dados e anexe comprovante se aplicável (limite de 4 MB).
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Tipo de Solicitação
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tipo: e.target.value as JustificativaTipo,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium"
                >
                  <option value="ESQUECIMENTO_PONTO">Esquecimento de Ponto (Ajustar Horário)</option>
                  <option value="ATESTADO_MEDICO">Atestado Médico / Odontológico</option>
                  <option value="DECLARACAO_COMPARECIMENTO">Declaração de Comparecimento</option>
                  <option value="ABONO_FALTA">Abono de Falta / Ausência Justificada</option>
                  <option value="OUTRO">Outra Justificativa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Data do Ocorrido / Início
                </label>
                <input
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dataInicio: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Campos condicionais: Esquecimento de Ponto */}
            {formData.tipo === "ESQUECIMENTO_PONTO" && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">
                    Qual batida você esqueceu?
                  </label>
                  <select
                    value={formData.tipoBatidaAjuste}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tipoBatidaAjuste: e.target.value as "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT",
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm"
                  >
                    <option value="ENTRY">Entrada Inicial do Turno</option>
                    <option value="LUNCH_START">Saída para Intervalo / Almoço</option>
                    <option value="LUNCH_END">Retorno do Intervalo / Almoço</option>
                    <option value="EXIT">Saída Final do Turno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">
                    Horário efetivo em que ocorreu:
                  </label>
                  <input
                    type="time"
                    value={formData.horarioAjustado}
                    onChange={(e) => setFormData((prev) => ({ ...prev, horarioAjustado: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2.5 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {/* Campos condicionais: Atestado / Declaração */}
            {(formData.tipo === "ATESTADO_MEDICO" || formData.tipo === "DECLARACAO_COMPARECIMENTO") && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                    Data de Término (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.dataFim}
                    min={formData.dataInicio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dataFim: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-amber-200 dark:border-amber-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                    Dias de Afastamento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.diasAfastamento}
                    onChange={(e) => setFormData((prev) => ({ ...prev, diasAfastamento: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 border border-amber-200 dark:border-amber-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* UPLOAD SEGURO DE ANEXO (FOTO OU PDF COM LIMITE DE 4MB) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Comprovante / Atestado (Foto ou PDF)</span>
                <span className="text-[11px] text-slate-400 font-normal">Máximo de 4 MB</span>
              </label>

              {!arquivoPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-emerald-500 dark:hover:border-emerald-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/[0.01]"
                >
                  <UploadCloud className="mx-auto text-slate-400 dark:text-slate-500 mb-2" size={32} />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Clique para selecionar ou arraste o comprovante
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Formatos aceitos: JPEG, PNG, WEBP ou PDF (até 4 MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {arquivoPreview.previewUrl ? (
                      <img
                        src={arquivoPreview.previewUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-xl border border-emerald-500/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                        <FileText size={24} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {arquivoPreview.nome}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {arquivoPreview.tamanhoFormatado} • Pronto para envio
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoverArquivo}
                    className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Remover anexo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Motivo / Descrição detalhada
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                required
                placeholder="Descreva claramente o motivo da solicitação para conferência do RH..."
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm resize-none"
              />
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="px-5 py-2.5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-emerald-600/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Solicitação"
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-amber-500 uppercase flex items-center gap-1">
            <Clock size={12} /> Pendentes
          </p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{stats.pendentes}</p>
        </div>
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-500 uppercase flex items-center gap-1">
            <Check size={12} /> Aprovadas
          </p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.aprovadas}</p>
        </div>
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-red-500 uppercase flex items-center gap-1">
            <X size={12} /> Recusadas
          </p>
          <p className="text-2xl font-bold text-red-500 mt-1">{stats.rejeitadas}</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full max-w-full">
        <Filter size={16} className="text-slate-400 shrink-0" />
        {(["TODOS", "PENDENTE", "APROVADO", "REJEITADO"] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filterStatus === st
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
            }`}
          >
            {st === "TODOS"
              ? "Todas"
              : st === "PENDENTE"
              ? "Pendentes"
              : st === "APROVADO"
              ? "Aprovadas"
              : "Recusadas"}
          </button>
        ))}
      </div>

      {/* LISTAGEM DE SOLICITAÇÕES */}
      {filteredJustificativas.length === 0 ? (
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center">
          <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJustificativas.map((j) => {
            const hasComprovante = !!j.comprovantePath;

            return (
              <div
                key={j.id}
                className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIPO_COLORS[j.tipo] || TIPO_COLORS.OUTRO}`}>
                      {TIPO_LABELS[j.tipo] || j.tipo}
                    </span>

                    {j.aprovado === null && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                        Pendente
                      </span>
                    )}
                    {j.aprovado === true && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        Aprovado
                      </span>
                    )}
                    {j.aprovado === false && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                        Recusado
                      </span>
                    )}

                    {isAdmin && j.user && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        • {j.user.name}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-400">
                    Enviado em {new Date(j.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {j.descricao}
                </div>

                {/* Detalhes de Horário / Dias */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-500" />
                    Data: {new Date(j.dataInicio).toLocaleDateString("pt-BR")}
                    {j.dataFim ? ` até ${new Date(j.dataFim).toLocaleDateString("pt-BR")}` : ""}
                  </span>

                  {j.horarioAjustado && (
                    <span className="flex items-center gap-1.5 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                      <Clock size={13} />
                      Horário Ajustado: {j.horarioAjustado} ({j.tipoBatidaAjuste || "Batida"})
                    </span>
                  )}

                  {hasComprovante && (
                    <button
                      onClick={() => {
                        setVisualizarAnexoUrl(api.justificativa.getComprovanteUrl(j.id));
                        setVisualizarAnexoNome(j.comprovanteNomeOriginal || "Comprovante");
                      }}
                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      <Paperclip size={13} />
                      {j.comprovanteNomeOriginal || "Ver Anexo"}
                    </button>
                  )}
                </div>

                {/* Motivo da Recusa se Rejeitado */}
                {j.aprovado === false && j.motivoRecusa && (
                  <div className="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                    <MessageSquareWarning size={15} className="shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <span className="font-bold">Motivo da Recusa pelo RH: </span>
                      {j.motivoRecusa}
                    </div>
                  </div>
                )}

                {/* Ações do Administrador / Gestor */}
                {isAdmin && j.aprovado === null && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5 w-full">
                    <button
                      onClick={() => {
                        setModalRecusaId(j.id);
                        setMotivoRecusa("");
                      }}
                      disabled={actionPending === j.id}
                      className="w-full sm:w-auto px-4 py-2 border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 rounded-xl hover:bg-red-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <X size={14} />
                      Recusar com Motivo
                    </button>

                    <button
                      onClick={() => handleAprovar(j.id)}
                      disabled={actionPending === j.id}
                      className="w-full sm:w-auto px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-emerald-600/30"
                    >
                      {actionPending === j.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Aprovar Solicitação
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA JUSTIFICAR RECUSA (ADMIN) */}
      {modalRecusaId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <MessageSquareWarning size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Recusar Solicitação
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Informe o motivo para orientação do colaborador
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo da Recusa:
              </label>
              <textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={3}
                placeholder="Exemplo: Foto do atestado médico está ilegível ou sem carimbo com CRM; favor reenviar imagem nítida."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalRecusaId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRecusa}
                disabled={motivoRecusa.trim().length < 5}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE ANEXO SEGURO */}
      {visualizarAnexoUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Paperclip size={18} className="text-emerald-500" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-sm">
                  {visualizarAnexoNome}
                </h4>
              </div>
              <button
                onClick={() => setVisualizarAnexoUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950/60 rounded-xl p-4 min-h-[300px]">
              <iframe
                src={visualizarAnexoUrl}
                title="Comprovante"
                className="w-full h-[450px] rounded-lg border-0"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={visualizarAnexoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Eye size={13} />
                Abrir em nova aba
              </a>
              <button
                onClick={() => setVisualizarAnexoUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

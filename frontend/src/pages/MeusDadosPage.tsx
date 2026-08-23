import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../services/api";
import type { MyDataResponse, AuditLogEntry } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { PageHeader } from "../components/common/PageHeader";
import { MeusDadosSkeleton } from "../components/profile/MeusDadosSkeleton";
import {
  User as UserIcon,
  Fingerprint,
  Clock,
  Shield,
  FileText,
  Trash2,
  Loader2,
  AlertTriangle,
  Pencil,
  Download,
  Check,
  X,
  ScanFace,
} from "lucide-react";

export function MeusDadosPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<MyDataResponse | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingFace, setIsDeletingFace] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [myData, myLogs] = await Promise.all([
        api.privacy.getMyData(),
        api.privacy.getMyLogs(),
      ]);
      setData(myData);
      setLogs(myLogs.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeleteFace() {
    setIsDeletingFace(true);
    try {
      await api.privacy.deleteMyFace();
      await refreshUser();
      await loadData();
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover biometria.");
    } finally {
      setIsDeletingFace(false);
    }
  }

  function startEditing() {
    if (!data) return;
    setEditName(data.dadosPessoais.nome ?? "");
    setEditEmail(data.dadosPessoais.email ?? "");
    setIsEditing(true);
    setEditSuccess(false);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditSuccess(false);
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    setError(null);
    try {
      await api.privacy.updateMyData({ name: editName, email: editEmail });
      setEditSuccess(true);
      setIsEditing(false);
      await refreshUser();
      await loadData();
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dados.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleExportData() {
    if (!data) return;
    const payload = {
      ...data,
      logs,
      exportadoEm: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meus-dados-viggo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return <MeusDadosSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <AlertTriangle className="text-red-500 mx-auto mb-3" size={36} />
        <p className="text-slate-700 dark:text-slate-200 font-semibold mb-2">{error ?? "Dados não disponíveis."}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-bold cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    EMPLOYEE: "Funcionário",
    ENTERPRISE_ADMIN: "Administrador da Empresa",
    MASTER: "Administrador Master",
  };
  const cargoLabel = roleLabels[data.dadosPessoais.cargo] ?? data.dadosPessoais.cargo;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Meus Dados & Privacidade (LGPD)"
        subtitle="Gerenciamento de perfil, biometria e direitos do titular"
        helpText="Visualize suas informações cadastrais, histórico de acessos auditados e exerça seus direitos de titular de dados conforme a LGPD."
        actions={
          <button
            onClick={handleExportData}
            className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-semibold flex items-center gap-2 text-sm cursor-pointer"
          >
            <Download size={16} />
            Exportar Meus Dados (JSON)
          </button>
        }
      />

      {/* DADOS PESSOAIS */}
      <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl flex items-center justify-center">
            <UserIcon className="text-emerald-600 dark:text-emerald-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Dados Pessoais</h2>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="ml-auto px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Pencil size={14} />
              Editar
            </button>
          )}
        </div>

        {editSuccess && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            Dados atualizados com sucesso!
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {isSaving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="px-5 py-2.5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors font-bold disabled:opacity-50 cursor-pointer text-sm"
              >
                <X size={16} className="inline mr-1" />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Nome" value={data.dadosPessoais.nome} />
            <InfoField label="E-mail" value={data.dadosPessoais.email} />
            <InfoField label="CPF" value={data.dadosPessoais.cpf ?? "Não informado"} />
            <InfoField label="Cargo" value={cargoLabel} />
            <InfoField label="Data de Cadastro" value={formatDate(data.dadosPessoais.dataCadastro)} />
            <InfoField label="Último Login" value={data.dadosPessoais.ultimoLogin ? formatDate(data.dadosPessoais.ultimoLogin) : "—"} />
          </div>
        )}
      </section>

      {/* DADOS BIOMÉTRICOS */}
      <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/60 rounded-xl flex items-center justify-center">
            <Fingerprint className="text-purple-600 dark:text-purple-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Dados Biométricos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <InfoField label="Biometria Cadastrada" value={data.dadosBiometricos.possuiDescriptor ? "Sim" : "Não"} />
          <InfoField label="Dimensões do Vetor" value={data.dadosBiometricos.dimensoes > 0 ? `${data.dadosBiometricos.dimensoes} floats` : "—"} />
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.dadosBiometricos.observacao}</p>
        </div>
        {!data.dadosBiometricos.possuiDescriptor && (
          <button
            onClick={() => navigate("/register")}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm mb-4"
          >
            <ScanFace size={18} />
            Cadastrar Biometria
          </button>
        )}
        {data.dadosBiometricos.possuiDescriptor && (
          <>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-5 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm"
              >
                <Trash2 size={18} />
                Excluir Minha Biometria
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-300">Confirmar exclusão da biometria?</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Você não conseguirá bater ponto até cadastrar novamente sua face.
                      Seu consentimento biométrico será revogado (Art. 18, VIII LGPD).
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteFace}
                    disabled={isDeletingFace}
                    className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {isDeletingFace ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    {isDeletingFace ? "Removendo..." : "Sim, excluir"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingFace}
                    className="px-5 py-2.5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors font-bold disabled:opacity-50 cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* REGISTROS DE PONTO */}
      <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/60 rounded-xl flex items-center justify-center">
            <Clock className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Registros de Ponto</h2>
          <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
            {data.registrosPonto.length} {data.registrosPonto.length === 1 ? "registro" : "registros"}
            {data.registrosPonto.length === 100 && " (últimos 100)"}
          </span>
        </div>
        {data.registrosPonto.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum registro de ponto encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">NSR</th>
                  <th className="p-3">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-sm text-slate-600 dark:text-slate-300">
                {data.registrosPonto.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-medium">{formatDate(reg.createdAt)}</td>
                    <td className="p-3 font-mono">{reg.nsr}</td>
                    <td className="p-3">
                      <CheckinTypeBadge type={reg.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CONSENTIMENTOS */}
      <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 rounded-xl flex items-center justify-center">
            <Shield className="text-amber-600 dark:text-amber-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Consentimentos</h2>
        </div>
        {data.consentimentos.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum consentimento registrado.</p>
        ) : (
          <div className="space-y-3">
            {data.consentimentos.map((consent, i) => {
              const url = consentUrl(consent.tipo);
              return (
                <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                  <div>
                    {url ? (
                      <Link
                        to={url}
                        target={url.startsWith("http") ? "_blank" : undefined}
                        className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {consentTipoLabel(consent.tipo)}
                      </Link>
                    ) : (
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{consentTipoLabel(consent.tipo)}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Versão {consent.versao} • Aceito em {formatDate(consent.createdAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${consent.aceite ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>
                    {consent.aceite ? "Aceito" : "Revogado"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* LOGS DE ACESSO */}
      <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
            <FileText className="text-slate-600 dark:text-slate-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Logs de Acesso</h2>
          <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
            {logs.length} {logs.length === 1 ? "registro" : "registros"}
            {logs.length === 50 && " (últimos 50)"}
          </span>
        </div>
        {logs.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum log de acesso encontrado.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="border border-slate-100 dark:border-white/5 rounded-xl p-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{log.action}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(log.createdAt)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-500 dark:text-slate-400">
                  {log.entity && <span>Entidade: <strong className="font-mono text-slate-700 dark:text-slate-300">{log.entity}</strong></span>}
                  {log.ip && <span>IP: <strong className="font-mono text-slate-700 dark:text-slate-300">{log.ip}</strong></span>}
                  {log.legalBasis && <span className="text-emerald-600 dark:text-emerald-400">Base legal: {log.legalBasis}</span>}
                  {log.purpose && <span className="text-slate-600 dark:text-slate-300">Finalidade: {log.purpose}</span>}
                  {log.personalDataCategories && log.personalDataCategories.length > 0 && (
                    <span>Categorias: {log.personalDataCategories.join(", ")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{value}</p>
    </div>
  );
}

function CheckinTypeBadge({ type }: { type: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    ENTRY: { label: "Entrada", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
    LUNCH_START: { label: "Saída Intervalo", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
    LUNCH_END: { label: "Retorno Intervalo", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
    EXIT: { label: "Saída", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  };
  const cfg = labels[type] ?? { label: type, color: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

function consentTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    TERMOS_DE_USO: "Termos de Uso",
    POLITICA_PRIVACIDADE: "Política de Privacidade",
    BIOMETRIA: "Biometria Facial",
    DPA: "Contrato de Tratamento de Dados (DPA)",
  };
  return labels[tipo] ?? tipo;
}

function consentUrl(tipo: string): string | null {
  const urls: Record<string, string> = {
    TERMOS_DE_USO: "/termos-de-uso",
    POLITICA_PRIVACIDADE: "/politica-privacidade",
    BIOMETRIA: "/consentimento-biometria",
    DPA: "/contrato-de-tratamento-de-dados",
  };
  return urls[tipo] ?? null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

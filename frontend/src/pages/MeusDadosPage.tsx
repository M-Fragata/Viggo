import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { MyDataResponse, AuditLogEntry } from "../services/api";
import { useAuth } from "../hooks/useAuth";
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
} from "lucide-react";

export function MeusDadosPage() {
  const { refreshUser } = useAuth();
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

  async function handleExportData() {
    try {
      const result = await api.privacy.exportMyData();
      const json = JSON.stringify(result, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exportacao_viggo_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar dados.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cargoLabel = data.dadosPessoais.cargo === "ENTERPRISE_ADMIN" ? "Administrador" : data.dadosPessoais.cargo === "MASTER" ? "Master" : "Funcionário";

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Meus Dados — Portal LGPD</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Exercício dos direitos do titular — Art. 18 da Lei nº 13.709/2018 (LGPD)
          </p>
        </div>
        <button
          onClick={handleExportData}
          className="px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors font-semibold flex items-center gap-2 text-sm cursor-pointer"
        >
          <Download size={16} />
          Exportar Meus Dados (JSON)
        </button>
      </header>

      {/* DADOS PESSOAIS */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <UserIcon className="text-emerald-600" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Dados Pessoais</h2>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="ml-auto px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Pencil size={14} />
              Editar
            </button>
          )}
        </div>

        {editSuccess && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
            Dados atualizados com sucesso!
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
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
                className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-bold disabled:opacity-50 cursor-pointer text-sm"
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
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Fingerprint className="text-purple-600" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Dados Biométricos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <InfoField label="Biometria Cadastrada" value={data.dadosBiometricos.possuiDescriptor ? "Sim" : "Não"} />
          <InfoField label="Dimensões do Vetor" value={data.dadosBiometricos.dimensoes > 0 ? `${data.dadosBiometricos.dimensoes} floats` : "—"} />
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-slate-500">{data.dadosBiometricos.observacao}</p>
        </div>
        {data.dadosBiometricos.possuiDescriptor && (
          <>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm"
              >
                <Trash2 size={18} />
                Excluir Minha Biometria
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-red-700">Confirmar exclusão da biometria?</p>
                    <p className="text-sm text-red-600 mt-1">
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
                    className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-bold disabled:opacity-50 cursor-pointer text-sm"
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
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Clock className="text-blue-600" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Registros de Ponto</h2>
          <span className="ml-auto text-sm text-slate-400">
            {data.registrosPonto.length} {data.registrosPonto.length === 1 ? "registro" : "registros"}
            {data.registrosPonto.length === 100 && " (últimos 100)"}
          </span>
        </div>
        {data.registrosPonto.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nenhum registro de ponto encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">NSR</th>
                  <th className="p-3">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {data.registrosPonto.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/50">
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
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Shield className="text-amber-600" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Consentimentos</h2>
        </div>
        {data.consentimentos.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nenhum consentimento registrado.</p>
        ) : (
          <div className="space-y-3">
            {data.consentimentos.map((consent, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div>
                  <p className="font-semibold text-slate-700">{consentTipoLabel(consent.tipo)}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Versão {consent.versao} • Aceito em {formatDate(consent.createdAt)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${consent.aceite ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {consent.aceite ? "Aceito" : "Revogado"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* LOGS DE ACESSO */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <FileText className="text-slate-600" size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Logs de Acesso</h2>
          <span className="ml-auto text-sm text-slate-400">
            {logs.length} {logs.length === 1 ? "registro" : "registros"}
            {logs.length === 50 && " (últimos 50)"}
          </span>
        </div>
        {logs.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nenhum log de acesso encontrado.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold text-slate-700">{log.action}</span>
                  <span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-500">
                  {log.entity && <span>Entidade: <strong className="font-mono">{log.entity}</strong></span>}
                  {log.ip && <span>IP: <strong className="font-mono">{log.ip}</strong></span>}
                  {log.legalBasis && <span className="text-emerald-600">Base legal: {log.legalBasis}</span>}
                  {log.purpose && <span className="text-slate-600">Finalidade: {log.purpose}</span>}
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
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-700 font-medium">{value}</p>
    </div>
  );
}

function CheckinTypeBadge({ type }: { type: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    ENTRY: { label: "Entrada", color: "bg-emerald-100 text-emerald-700" },
    LUNCH_START: { label: "Saída Intervalo", color: "bg-amber-100 text-amber-700" },
    LUNCH_END: { label: "Retorno Intervalo", color: "bg-blue-100 text-blue-700" },
    EXIT: { label: "Saída", color: "bg-red-100 text-red-700" },
  };
  const cfg = labels[type] ?? { label: type, color: "bg-slate-100 text-slate-700" };
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

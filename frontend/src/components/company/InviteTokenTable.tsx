import { useState } from "react";
import { Copy, ChevronDown, ChevronUp, XCircle, User, Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "../../hooks/useToast";
import type { InviteTokenResponse } from "../../services/api";

interface InviteTokenTableProps {
  tokens: InviteTokenResponse[];
  onRevoke: (id: string) => void;
  onCopy: (url: string) => void;
}

export function InviteTokenTable({ tokens, onRevoke, onCopy }: InviteTokenTableProps) {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCopy = async (url: string, id: string) => {
    setCopyingId(id);
    try {
      await navigator.clipboard.writeText(url);
      onCopy(url);
      toast.success("Link copiado!", { description: "Pronto para compartilhar" });
    } catch {
      toast.error("Erro ao copiar", { description: "Tente selecionar e copiar manualmente" });
    } finally {
      setCopyingId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Tem certeza que deseja revogar este token? A ação não pode ser desfeita.")) return;
    setRevokingId(id);
    try {
      onRevoke(id);
      toast.success("Token revogado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao revogar token");
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (dateStr: string) => format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const formatDateShort = (dateStr: string) => format(new Date(dateStr), "dd/MM", { locale: ptBR });

  const getStatus = (token: InviteTokenResponse) => {
    const now = new Date();
    const expires = new Date(token.expiresAt);
    if (token.revokedAt) return { label: "Revogado", class: "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400", icon: XCircle };
    if (expires < now) return { label: "Expirado", class: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", icon: AlertCircle };
    if (!token.isActive) return { label: "Inativo", class: "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400", icon: XCircle };
    return { label: "Ativo", class: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", icon: CheckCircle };
  };

  const getUsesDisplay = (token: InviteTokenResponse) => {
    const max = token.maxUses === null ? "∞" : token.maxUses.toString();
    return `${token.currentUses} / ${max}`;
  };

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Nenhum token de convite</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Clique em "Gerar Link de Convite" para criar o primeiro</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile Cards - Accordion */}
      <div className="sm:hidden space-y-3">
        {tokens.map((token) => {
          const status = getStatus(token);
          const StatusIcon = status.icon;
          const isExpanded = expandedId === token.id;

          return (
            <div key={token.id} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              {/* Header do Card */}
              <div
                onClick={() => toggleExpand(token.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <code className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded font-mono text-sm text-slate-700 dark:text-slate-200 truncate">
                    {token.tokenMasked}
                  </code>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.class} whitespace-nowrap shrink-0`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
              </div>

              {/* Conteúdo Expandido */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/10 pt-3 animate-in slide-in-from-top duration-200 space-y-4">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Criado em</span>
                      <span className="text-slate-600 dark:text-slate-300">{formatDate(token.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Expira em</span>
                      <span className="text-slate-600 dark:text-slate-300">{formatDate(token.expiresAt)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Usos</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{getUsesDisplay(token)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(token.inviteUrl, token.id); }}
                      disabled={copyingId === token.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {copyingId === token.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      Copiar link
                    </button>
                    {!token.revokedAt && new Date(token.expiresAt) > new Date() && token.isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRevoke(token.id); }}
                        disabled={revokingId === token.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {revokingId === token.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Revogar
                      </button>
                    )}
                  </div>

                  {/* Usuários que usaram */}
                  {token.usedByUsers.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                      <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-emerald-500" />
                        Funcionários que usaram este token ({token.usedByUsers.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {token.usedByUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 dark:text-white text-sm">{user.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(user.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {token.usedByUsers.length === 0 && (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/10 pt-4">
                      <User className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm">Nenhum funcionário usou este token ainda</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
              <th className="pb-3 px-2">Token</th>
              <th className="pb-3 px-2">Criado em</th>
              <th className="pb-3 px-2">Expira em</th>
              <th className="pb-3 px-2">Usos</th>
              <th className="pb-3 px-2">Status</th>
              <th className="pb-3 px-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {tokens.map((token) => {
              const status = getStatus(token);
              const StatusIcon = status.icon;
              const isExpanded = expandedId === token.id;

              return (
                <tr key={token.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded font-mono text-sm text-slate-700 dark:text-slate-200">
                        {token.tokenMasked}
                      </code>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-slate-600 dark:text-slate-300 text-sm">{formatDateShort(token.createdAt)}</td>
                  <td className="py-4 px-2 text-slate-600 dark:text-slate-300 text-sm">{formatDateShort(token.expiresAt)}</td>
                  <td className="py-4 px-2 text-slate-600 dark:text-slate-300 text-sm font-mono">{getUsesDisplay(token)}</td>
                  <td className="py-4 px-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleCopy(token.inviteUrl, token.id)}
                        disabled={copyingId === token.id}
                        className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Copiar link"
                      >
                        {copyingId === token.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleExpand(token.id)}
                        className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors ml-1"
                        aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {!token.revokedAt && new Date(token.expiresAt) > new Date() && token.isActive && (
                        <button
                          onClick={() => handleRevoke(token.id)}
                          disabled={revokingId === token.id}
                          className="cursor-pointer p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 ml-1"
                          title="Revogar token"
                        >
                          {revokingId === token.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
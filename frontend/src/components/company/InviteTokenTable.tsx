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
    } catch {
      toast.error("Erro ao revogar token");
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (dateStr: string) => format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const formatDateShort = (dateStr: string) => format(new Date(dateStr), "dd/MM", { locale: ptBR });

  const getStatus = (token: InviteTokenResponse) => {
    const now = new Date();
    const expires = new Date(token.expiresAt);
    if (token.revokedAt) return { label: "Revogado", class: "bg-slate-100 text-slate-600", icon: XCircle };
    if (expires < now) return { label: "Expirado", class: "bg-amber-100 text-amber-700", icon: AlertCircle };
    if (!token.isActive) return { label: "Inativo", class: "bg-slate-100 text-slate-600", icon: XCircle };
    return { label: "Ativo", class: "bg-emerald-100 text-emerald-700", icon: CheckCircle };
  };

  const getUsesDisplay = (token: InviteTokenResponse) => {
    const max = token.maxUses === null ? "∞" : token.maxUses.toString();
    return `${token.currentUses} / ${max}`;
  };

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-700">Nenhum token de convite</h3>
        <p className="text-slate-500 mt-1">Clique em "Gerar Link de Convite" para criar o primeiro</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 text-left text-sm font-medium text-slate-500">
            <th className="pb-3 px-2">Token</th>
            <th className="pb-3 px-2">Criado em</th>
            <th className="pb-3 px-2">Expira em</th>
            <th className="pb-3 px-2">Usos</th>
            <th className="pb-3 px-2">Status</th>
            <th className="pb-3 px-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tokens.map((token) => {
            const status = getStatus(token);
            const StatusIcon = status.icon;
            const isExpanded = expandedId === token.id;

            return (
              <>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-slate-100 rounded font-mono text-sm text-slate-700">
                        {token.tokenMasked}
                      </code>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-slate-600 text-sm">{formatDateShort(token.createdAt)}</td>
                  <td className="py-4 px-2 text-slate-600 text-sm">{formatDateShort(token.expiresAt)}</td>
                  <td className="py-4 px-2 text-slate-600 text-sm font-mono">{getUsesDisplay(token)}</td>
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
                        className="cursor-pointer p-2 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
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
                        className="cursor-pointer p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                        aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {!token.revokedAt && new Date(token.expiresAt) > new Date() && token.isActive && (
                        <button
                          onClick={() => handleRevoke(token.id)}
                          disabled={revokingId === token.id}
                          className="cursor-pointer p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 ml-1"
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
                {isExpanded && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="p-0">
                      <div className="p-6 border-t border-slate-200 animate-in slide-in-from-top duration-200">

                        {token.usedByUsers.length > 0 && (
                          <div>
                            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                              <User className="w-4 h-4 text-emerald-500" />
                              Funcionários que usaram este token ({token.usedByUsers.length})
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {token.usedByUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                      <User className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-800">{user.name}</p>
                                      <p className="text-sm text-slate-500 flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-sm text-slate-500">{formatDate(user.createdAt)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {token.usedByUsers.length === 0 && (
                          <div className="text-center py-6 text-slate-500">
                            <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p>Nenhum funcionário usou este token ainda</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
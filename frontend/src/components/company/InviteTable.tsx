import { useState } from "react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InviteResponse } from "../../services/api";
import { Copy, Trash2, ExternalLink, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "../../hooks/useToast";

interface InviteTableProps {
  invites: InviteResponse[];
  onCancel: (id: string) => void;
  onCopyLink: (url: string) => void;
  baseUrl: string;
}

export function InviteTable({ invites, onCancel, onCopyLink, baseUrl }: InviteTableProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getStatus = (invite: InviteResponse) => {
    if (invite.usedAt) return { label: "Usado", color: "emerald", icon: CheckCircle };
    if (isPast(new Date(invite.expiresAt))) return { label: "Expirado", color: "red", icon: AlertCircle };
    return { label: "Pendente", color: "blue", icon: Clock };
  };

  const copyInviteLink = (invite: InviteResponse) => {
    const url = `${baseUrl}/accept-invite/${invite.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Link copiado!");
  };

  if (invites.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-slate-600 mb-1">Nenhum convite enviado</h3>
        <p className="text-slate-400">Clique em "Convidar Funcionário" para enviar o primeiro convite</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <th className="p-4 w-[30%] min-w-[180px]">Email</th>
            <th className="p-4 w-[15%] min-w-[120px]">Cargo</th>
            <th className="p-4 w-[15%] min-w-[120px]">Enviado em</th>
            <th className="p-4 w-[15%] min-w-[120px]">Expira em</th>
            <th className="p-4 w-[15%] min-w-[100px]">Status</th>
            <th className="p-4 w-[10%] min-w-[80px] text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
          {invites.map((invite) => {
            const status = getStatus(invite);
            const StatusIcon = status.icon;
            const canCancel = !invite.usedAt && !isPast(new Date(invite.expiresAt));

            return (
              <tr key={invite.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium text-slate-800 truncate max-w-[250px]">{invite.email}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {invite.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                  </span>
                </td>
                <td className="p-4 text-slate-500 whitespace-nowrap">
                  {format(new Date(invite.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </td>
                <td className="p-4 text-slate-500 whitespace-nowrap">
                  {format(new Date(invite.expiresAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-${status.color}-50 text-${status.color}-700 border border-${status.color}-200`}>
                    <StatusIcon size={12} className="shrink-0" />
                    {status.label}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => copyInviteLink(invite)}
                      className={`p-2 rounded-lg transition-colors ${copiedId === invite.id
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      title="Copiar link"
                    >
                      {copiedId === invite.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => onCopyLink(`${baseUrl}/accept-invite/${invite.id}`)}
                      className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Abrir link"
                    >
                      <ExternalLink size={16} />
                    </button>
                    {canCancel && (
                      <button
                        onClick={() => onCancel(invite.id)}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                        title="Cancelar convite"
                      >
                        <Trash2 size={16} />
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
  );
}
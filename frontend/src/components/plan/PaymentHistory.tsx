import { useEffect } from "react";
import { usePayment } from "../../hooks/usePayment";
import { formatPrice } from "../../../../shared/plans";
import { FileText, ExternalLink, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  CONFIRMED: { label: "Pago", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
  PENDING: { label: "Pendente", color: "text-amber-600 bg-amber-50", icon: Clock },
  OVERDUE: { label: "Atrasado", color: "text-red-600 bg-red-50", icon: AlertTriangle },
  CANCELLED: { label: "Cancelado", color: "text-slate-500 bg-slate-50", icon: AlertTriangle },
  REFUNDED: { label: "Reembolsado", color: "text-blue-600 bg-blue-50", icon: AlertTriangle },
};

const nfseConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Aguardando emissão", color: "text-slate-500 bg-slate-100" },
  ISSUED: { label: "Emitida", color: "text-emerald-600 bg-emerald-50" },
  NOT_APPLICABLE: { label: "N/A", color: "text-slate-400 bg-slate-50" },
};

export function PaymentHistory() {
  const { paymentHistory, isLoading, fetchHistory } = usePayment();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (isLoading && paymentHistory.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (paymentHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-500 font-medium">Nenhum pagamento registrado</p>
        <p className="text-sm text-slate-400 mt-1">Seu histórico de pagamentos aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <th className="pb-3 pr-4">Data</th>
            <th className="pb-3 pr-4">Valor</th>
            <th className="pb-3 pr-4">Método</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">NFS-e</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {paymentHistory.map((payment) => {
            const status = statusConfig[payment.status] ?? statusConfig.PENDING;
            const nfse = nfseConfig[payment.nfseStatus] ?? nfseConfig.PENDING;
            const StatusIcon = status.icon;
            const methodLabel = payment.billingType === "PIX" ? "Pix" : payment.billingType === "CREDIT_CARD" ? "Cartão" : payment.billingType;

            return (
              <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 pr-4 text-sm text-slate-700">
                  {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                </td>
                <td className="py-3 pr-4 text-sm font-bold text-slate-800">
                  {formatPrice(payment.amount)}
                </td>
                <td className="py-3 pr-4 text-sm text-slate-600">
                  {methodLabel}
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                </td>
                <td className="py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${nfse.color}`}>
                    {nfse.label}
                  </span>
                  {payment.nfseUrl && (
                    <a
                      href={payment.nfseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 ml-1 text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      <ExternalLink size={10} />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

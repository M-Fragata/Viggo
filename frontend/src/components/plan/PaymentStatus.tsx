import type { CompanyResponse } from "../../services/api";
import { useCompanyStatus } from "../../hooks/useAuth";
import { formatPrice } from "../../../../shared/plans";
import { CreditCard, Clock, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

interface PaymentStatusProps {
  company: CompanyResponse;
  onOpenCheckout?: () => void;
}

export function PaymentStatus({ company, onOpenCheckout }: PaymentStatusProps) {
  const { status, planExpiresAt, asaasPaymentMethod, pricing } = company;
  const { isTrialExpired, getTrialDaysRemaining } = useCompanyStatus();

  const trialDaysRemaining = getTrialDaysRemaining(planExpiresAt);
  const trialExpired = isTrialExpired(planExpiresAt, status);

  const statusConfig = {
    TRIAL: {
      icon: Clock,
      color: "emerald",
      bgClass: "bg-emerald-50 border-emerald-200",
      iconClass: "text-emerald-500",
      label: "Trial de 30 dias ativo",
    },
    ACTIVE: {
      icon: CheckCircle,
      color: "blue",
      bgClass: "bg-blue-50 border-blue-200",
      iconClass: "text-blue-500",
      label: "Plano ativo",
    },
    SUSPENDED: {
      icon: AlertTriangle,
      color: "amber",
      bgClass: "bg-amber-50 border-amber-200",
      iconClass: "text-amber-500",
      label: "Plano suspenso",
    },
    CANCELLED: {
      icon: XCircle,
      color: "red",
      bgClass: "bg-red-50 border-red-200",
      iconClass: "text-red-500",
      label: "Plano cancelado",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const paymentMethodLabel = asaasPaymentMethod === "PIX" ? "Pix" : asaasPaymentMethod === "CREDIT_CARD" ? "Cartão de crédito" : null;

  return (
    <div className={`rounded-2xl border p-5 ${config.bgClass}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl bg-white/80 ${config.iconClass}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-800">{config.label}</h3>
          </div>

          {status === "TRIAL" && planExpiresAt && (
            <p className="text-sm text-slate-600">
              {trialExpired
                ? "Seu trial expirou. Ative seu plano para continuar usando."
                : `${trialDaysRemaining} dia${trialDaysRemaining !== 1 ? "s" : ""} restante${trialDaysRemaining !== 1 ? "s" : ""} para decidir seu plano`}
            </p>
          )}

          {status === "ACTIVE" && (
            <div className="space-y-1">
              <p className="text-sm text-slate-600">
                Próximo pagamento: <span className="font-bold">{formatPrice(pricing.total)}</span>
                {planExpiresAt && ` em ${new Date(planExpiresAt).toLocaleDateString("pt-BR")}`}
              </p>
              {paymentMethodLabel && (
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <CreditCard size={14} />
                  {paymentMethodLabel}
                </p>
              )}
              {pricing.extraEmployees > 0 && (
                <p className="text-xs text-slate-400">
                  {pricing.extraEmployees} funcionário{pricing.extraEmployees > 1 ? "s" : ""} extra{pricing.extraEmployees > 1 ? "s" : ""} (+{formatPrice(pricing.extraTotal)})
                </p>
              )}
            </div>
          )}

          {status === "SUSPENDED" && (
            <p className="text-sm text-slate-600">
              Regularize seu pagamento para reativar o plano.
            </p>
          )}

          {status === "CANCELLED" && (
            <p className="text-sm text-slate-600">
              Seu plano foi cancelado. Assine novamente para acessar.
            </p>
          )}

          {(status === "TRIAL" || status === "SUSPENDED" || status === "CANCELLED") && onOpenCheckout && (
            <button
              onClick={onOpenCheckout}
              className="mt-3 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              {status === "TRIAL" ? "Ativar plano" : "Reativar plano"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

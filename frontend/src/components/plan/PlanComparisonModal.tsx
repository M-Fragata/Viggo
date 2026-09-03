import { useEffect } from "react";
import type { PlanTier } from "../../services/api";
import { PlanBadge } from "./PlanBadge";
import { X } from "lucide-react";

interface PlanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanTier;
}

const planFeatures = {
  DYNAMIC: {
    name: "Ponto Fragata",
    price: 54.90,
    maxEmployees: null,
    features: [
      "Até 10 funcionários: R$ 54,90/mês",
      "Funcionários extras: +R$ 5,00/pessoa",
      "Reconhecimento facial",
      "Controle de localização (GPS)",
      "Espelho de ponto e relatórios",
      "Convites por link",
      "Suporte por Email e Whatsapp",
      "Pix ou Cartão de Crédito",
    ],
    color: "emerald",
  },
  ENTERPRISE_CUSTOM: {
    name: "Enterprise",
    price: null,
    maxEmployees: null,
    features: [
      "Acima de 50 funcionários",
      "Plano personalizado",
      "Tudo do plano Ponto Fragata",
      "SLA garantido 99.9%",
      "Gerente de conta dedicado",
      "Suporte prioritário 24/7",
    ],
    color: "amber",
  },
} as const;

type PlanKey = keyof typeof planFeatures;

export function PlanComparisonModal({ isOpen, onClose, currentPlan }: PlanComparisonModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const plans: PlanKey[] = ["DYNAMIC", "ENTERPRISE_CUSTOM"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <dialog
        className="absolute z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95"
        open
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Comparar Planos</h2>
            <p className="text-slate-500 mt-1">Escolha o plano ideal para sua empresa</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((planKey) => {
            const plan = planFeatures[planKey];
            const isCurrent = planKey === currentPlan;

            return (
              <div
                key={planKey}
                className={`relative rounded-2xl border-2 p-6 transition-all ${
                  isCurrent
                    ? `border-${plan.color}-500 bg-${plan.color}-50 shadow-lg ring-2 ring-${plan.color}-100`
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">
                      Atual
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <PlanBadge plan={planKey as PlanTier} size="lg" showLabel />
                  <h3 className="text-xl font-bold text-slate-800 mt-2">{plan.name}</h3>
                  <div className="mt-2">
                    {plan.price ? (
                      <>
                        <span className="text-3xl font-bold text-slate-800">R$ {plan.price.toFixed(2)}</span>
                        <span className="text-slate-500">/mês</span>
                        <p className="text-xs text-slate-400 mt-1">+R$ 5,00 por funcionário extra</p>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-slate-800">Sob consulta</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    isCurrent
                      ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                      : `bg-${plan.color}-500 text-white hover:bg-${plan.color}-600`
                  }`}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Plano Atual" : planKey === "DYNAMIC" ? "Escolher plano" : "Contatar vendas"}
                </button>
              </div>
            );
          })}
        </div>
      </dialog>
      <div className="fixed inset-0" onClick={onClose} />
    </div>
  );
}

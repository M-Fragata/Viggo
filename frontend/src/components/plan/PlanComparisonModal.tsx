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
  TIER_I: {
    name: "Tier I",
    price: 49.9,
    maxEmployees: 10,
    apiLimits: { general: 100, checkin: 10, faceValidation: 30 },
    features: [
      "Até 10 funcionários",
      "Check-in com foto",
      "Validação facial básica",
      "Relatórios mensais",
      "Suporte por email",
      "API: 100 req/min",
    ],
    color: "emerald",
  },
  TIER_II: {
    name: "Tier II",
    price: 149.9,
    maxEmployees: 50,
    apiLimits: { general: 300, checkin: 20, faceValidation: 60 },
    features: [
      "Até 50 funcionários",
      "Check-in com foto + biometria",
      "Validação facial avançada",
      "Relatórios semanais + mensais",
      "Suporte prioritário (email + chat)",
      "API: 300 req/min",
      "Webhooks",
      "Múltiplos locais",
    ],
    color: "blue",
  },
  TIER_III: {
    name: "Tier III",
    price: 349.9,
    maxEmployees: 150,
    apiLimits: { general: 600, checkin: 50, faceValidation: 100 },
    features: [
      "Até 150 funcionários",
      "Todas as funcionalidades do Tier II",
      "Relatórios em tempo real",
      "Suporte 24/7 (telefone + chat)",
      "API: 600 req/min",
      "SSO (SAML/OIDC)",
      "Auditoria completa",
      "Integrações personalizadas",
    ],
    color: "purple",
  },
  ENTERPRISE_CUSTOM: {
    name: "Enterprise",
    price: null,
    maxEmployees: null,
    apiLimits: { general: 1000, checkin: 100, faceValidation: 200 },
    features: [
      "Funcionários ilimitados",
      "Todas as funcionalidades do Tier III",
      "SLA garantido 99.9%",
      "Gerente de conta dedicado",
      "API: 1000 req/min",
      "Implantação on-premise",
      "Customizações sob demanda",
      "Treinamento da equipe",
      "Migração assistida",
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

  const plans: PlanKey[] = ["TIER_I", "TIER_II", "TIER_III", "ENTERPRISE_CUSTOM"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <dialog
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((planKey) => {
            const plan = planFeatures[planKey];
            const isCurrent = planKey === currentPlan;
            const isUpgrade = plans.indexOf(planKey) > plans.indexOf(currentPlan as PlanKey);

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
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-slate-800">Sob consulta</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-4.997M13 16a3 3 0 01-3 3H7" />
                    </svg>
                    <span className="font-medium">
                      {plan.maxEmployees ? `${plan.maxEmployees} funcionários` : "Ilimitado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="font-medium">
                      API: {plan.apiLimits.general} req/min
                    </span>
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
                  {isCurrent ? "Plano Atual" : isUpgrade ? "Upgrade" : "Downgrade"}
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
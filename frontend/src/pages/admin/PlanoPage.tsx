import { useState } from "react";
import { Users, CreditCard, ArrowUpRight, Building2 } from "lucide-react";
import { useCompany, usePlanLimits } from "../../hooks/useCompany";
import { useCompanyStatus } from "../../hooks/useAuth";
import { PlanBadge, PlanComparisonModal, UsageProgressBar, PaymentStatus, PaymentHistory, CheckoutModal } from "../../components/plan";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";

export function PlanoPage() {
  const { company, isLoading } = useCompany();
  const { getPlanLimit, getPlanColor, getPlanLabel } = usePlanLimits();
  const { isTrialExpired, getTrialDaysRemaining } = useCompanyStatus();

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const planColor = plan ? getPlanColor(plan) : "gray";
  const trialExpired = isTrialExpired(company?.planExpiresAt ?? null, company?.status ?? "ACTIVE");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />

      {company && (
        <PaymentStatus company={company} onOpenCheckout={() => setShowCheckout(true)} />
      )}

      {/* Detalhes do Plano */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Detalhes do Plano</h2>
            <p className="text-slate-500 text-sm">
              {plan ? getPlanLabel(plan) : "-"}
              {company?.pricing && company.plan === "DYNAMIC" && (
                <> — {company.pricing.paidEmployees} funcionário{company.pricing.paidEmployees !== 1 ? "s" : ""} pago{company.pricing.paidEmployees !== 1 ? "s" : ""}</>
              )}
            </p>
          </div>
          {plan && <PlanBadge plan={plan} size="lg" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Users className={`w-4 h-4 text-${planColor}-500`} />
              <span className="font-medium">Funcionários</span>
            </div>
            <UsageProgressBar
              current={company?.currentEmployees ?? 0}
              limit={planLimit?.maxEmployees ?? null}
              label=""
              size="lg"
            />
          </div>

          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <ArrowUpRight className={`w-4 h-4 text-${planColor}-500`} />
              <span className="font-medium">Limites da API</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Geral</span>
                <span className="font-mono font-bold">{planLimit?.api?.general ?? "-"}/min</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Check-in</span>
                <span className="font-mono font-bold">{planLimit?.api?.checkin ?? "-"}/min</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Face Validation</span>
                <span className="font-mono font-bold">{planLimit?.api?.faceValidation ?? "-"}/min</span>
              </div>
            </div>
          </div>

          {company?.pricing && company.plan === "DYNAMIC" && (
            <div className="bg-slate-50 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <CreditCard className={`w-4 h-4 text-${planColor}-500`} />
                <span className="font-medium">Cálculo do Preço</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Base (até {company.pricing.baseMaxEmployees})</span>
                  <span className="font-mono font-bold">R$ {company.pricing.basePrice.toFixed(2)}</span>
                </div>
                {company.pricing.extraEmployees > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{company.pricing.extraEmployees} extra{company.pricing.extraEmployees > 1 ? "s" : ""}</span>
                    <span className="font-mono font-bold">R$ {company.pricing.extraTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
                  <span>Total</span>
                  <span className="text-emerald-600">R$ {company.pricing.total.toFixed(2)}/mês</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6 flex flex-wrap gap-3">
          {(company?.status === "TRIAL" || company?.status === "SUSPENDED" || company?.status === "CANCELLED") && (
            <button
              onClick={() => setShowCheckout(true)}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              {company.status === "TRIAL" ? "Ativar plano" : "Reativar plano"}
            </button>
          )}
          <button
            onClick={() => setShowPlanModal(true)}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={18} />
            Comparar planos
          </button>
        </div>
      </div>

      {/* Trial ativo */}
      {company?.status === "TRIAL" && !trialExpired && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-800">Trial de 30 dias ativo</h3>
              <p className="text-emerald-600 text-sm">{getTrialDaysRemaining(company.planExpiresAt)} dias restantes para decidir seu plano</p>
            </div>
          </div>
        </div>
      )}

      {/* Trial expirado */}
      {trialExpired && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-red-800">Trial Expirado</h3>
              <p className="text-red-600 text-sm">Seu período de teste acabou. Ative seu plano para continuar usando.</p>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Pagamentos */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Histórico de Pagamentos</h2>
        <PaymentHistory />
      </div>

      {/* Modais */}
      <PlanComparisonModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} currentPlan={plan!} />
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

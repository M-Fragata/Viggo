import { useState, useRef } from "react";
import { Users, CreditCard, Calculator } from "lucide-react";
import { useCompany, usePlanLimits } from "../../hooks/useCompany";
import { PlanBadge, UsageProgressBar, PaymentStatus, PaymentHistory, CheckoutModal, PlanoSkeleton } from "../../components/plan";
import { PageHeader } from "../../components/common/PageHeader";
import { PricingCalculator } from "../../components/PricingCalculator";

export function PlanoPage() {
  const { company, isLoading } = useCompany();
  const { getPlanLimit, getPlanColor, getPlanLabel } = usePlanLimits();

  const [showCheckout, setShowCheckout] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const planColor = plan ? getPlanColor(plan) : "gray";

  const handleShowCalculator = () => {
    setShowCalculator((prev) => {
      const next = !prev;
      setTimeout(() => {
        calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return next;
    });
  };

  if (isLoading) {
    return <PlanoSkeleton />;
  }

  return (
    <div className="w-full space-y-6 min-w-0">
      <PageHeader
        title="Assinatura & Plano"
        subtitle="Gerenciamento de limites de colaboradores e faturamento"
        helpText="Gerencie a assinatura do Ponto Fragata, visualize limites de colaboradores ativos e consulte o status do seu plano."
      />

      {company && (
        <PaymentStatus company={company} onOpenCheckout={() => setShowCheckout(true)} />
      )}

      {/* Detalhes do Plano */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Detalhes do Plano</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {plan ? getPlanLabel(plan) : "-"}
              {company?.pricing && company.plan === "DYNAMIC" && (
                <>
                  {" "}
                  — R$ {company.pricing.basePrice.toFixed(2)}/mês até {company.pricing.baseMaxEmployees} funcionários
                  {" · +R$ "}
                  {company.pricing.extraPricePerUnit.toFixed(2)} por funcionário extra
                </>
              )}
            </p>
          </div>
          {plan && <PlanBadge plan={plan} size="lg" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
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

          {company?.pricing && company.plan === "DYNAMIC" && (
            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                <CreditCard className={`w-4 h-4 text-${planColor}-500`} />
                <span className="font-medium">Cálculo do Preço</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Base (até {company.pricing.baseMaxEmployees})</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">R$ {company.pricing.basePrice.toFixed(2)}</span>
                </div>
                {company.pricing.extraEmployees > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{company.pricing.extraEmployees} extra{company.pricing.extraEmployees > 1 ? "s" : ""}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">R$ {company.pricing.extraTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-white/10 pt-2 flex justify-between font-bold text-slate-800 dark:text-white">
                  <span>Total</span>
                  <span className="text-emerald-600 dark:text-emerald-400">R$ {company.pricing.total.toFixed(2)}/mês</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-white/10 pt-6 flex flex-wrap gap-3">
          {(company?.status === "TRIAL" || company?.status === "SUSPENDED" || company?.status === "CANCELLED") && (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard size={18} />
              {company.status === "TRIAL" ? "Ativar plano" : "Reativar plano"}
            </button>
          )}
          <button
            onClick={handleShowCalculator}
            className="w-full px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calculator size={18} />
            {showCalculator ? "Ocultar calculadora" : "Calculadora de preços"}
          </button>
        </div>

        {showCalculator && (
          <div ref={calculatorRef} className="mt-6 flex justify-center">
            <div className="w-full">
              <PricingCalculator onCtaClick={() => setShowCheckout(true)} />
            </div>
          </div>
        )}
      </div>

      {/* Histórico de Pagamentos */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Histórico de Pagamentos</h2>
        <PaymentHistory />
      </div>

      {/* Modais */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

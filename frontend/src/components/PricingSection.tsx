import { Link, useNavigate } from "react-router";
import { PLANS, getHighlightedPlan } from "../../../shared/plans";
import { PricingCard } from "./PricingCard";

export function PricingSection() {
  const navigate = useNavigate();
  const highlightedPlan = getHighlightedPlan();
  const regularPlans = PLANS.filter((p) => !p.highlighted && p.id !== "ENTERPRISE_CUSTOM");
  const customPlan = PLANS.find((p) => p.id === "ENTERPRISE_CUSTOM");

  const handleCtaClick = (planId: string) => {
    if (planId === "ENTERPRISE_CUSTOM") {
      navigate("/planos/custom");
    } else {
      navigate("/company/signup");
    }
  };

  return (
    <section className="py-20 bg-white" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-16">
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Planos simples e transparentes
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Todos os planos incluem trial de 30 dias, sem cartão de crédito.
            Cancele quando quiser.
          </p>
        </header>

        <div className="relative">
          <div
            className={`
              grid gap-8
              lg:grid-cols-3
              lg:items-start
              ${highlightedPlan ? "lg:pt-8" : ""}
            `}
            role="list"
          >
            {regularPlans
              .filter((p) => p.id === "TIER_I")
              .map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  onCtaClick={() => handleCtaClick(plan.id)}
                />
              ))}

            {highlightedPlan && (
              <PricingCard
                key={highlightedPlan.id}
                plan={highlightedPlan}
                onCtaClick={() => handleCtaClick(highlightedPlan.id)}
              />
            )}

            {regularPlans
              .filter((p) => p.id === "TIER_III")
              .map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  onCtaClick={() => handleCtaClick(plan.id)}
                />
              ))}
          </div>
        </div>

        {customPlan && (
          <div className="mt-16">
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-8 md:p-12 text-center">
              <div className="mx-auto max-w-2xl">
                <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Precisa de algo maior?
                </h3>
                <p className="mt-4 text-lg text-slate-600">
                  {customPlan.features[0].text}, integrações customizadas,
                  deploy on-premise, SLA personalizado e muito mais.
                </p>
                <div className="mt-8">
                  <Link
                    to="/planos/custom"
                    className={`
                      inline-flex items-center justify-center rounded-xl px-8 py-3.5
                      text-base font-semibold transition-colors
                      bg-slate-900 text-white hover:bg-slate-800
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900
                    `}
                  >
                    {customPlan.ctaText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
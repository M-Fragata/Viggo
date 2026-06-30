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
    <section className="py-24 bg-canvas-dark" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-7xl px-8">
        <header className="text-center mb-16 reveal">
          <h2 id="pricing-heading" className="text-4xl font-semibold tracking-tight text-on-dark leading-[1.2]">
            Planos simples e transparentes
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-dark-muted max-w-2xl mx-auto">
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
              reveal-stagger
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
          <div className="mt-16 reveal">
            <div className="rounded-lg border border-hairline bg-surface p-8 md:p-12 text-center">
              <div className="mx-auto max-w-2xl">
                <h3 className="text-3xl font-semibold text-ink leading-snug sm:text-4xl">
                  Precisa de algo maior?
                </h3>
                <p className="mt-4 text-lg leading-relaxed text-steel">
                  {customPlan.features[0].text}, integrações customizadas,
                  deploy on-premise, SLA personalizado e muito mais.
                </p>
                <div className="mt-8">
                  <Link
                    to="/planos/custom"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-on-primary hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
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
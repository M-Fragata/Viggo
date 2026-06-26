import { type PlanData, type PlanFeature, formatPrice, formatMaxEmployees } from "../../../shared/plans";

interface PricingCardProps {
  plan: PlanData;
  onCtaClick?: () => void;
}

export function PricingCard({ plan, onCtaClick }: PricingCardProps) {
  const isHighlighted = plan.highlighted;

  const cardBase = `
    relative rounded-2xl p-8 transition-all duration-300
    bg-white border shadow-xl
    flex flex-col h-full
    hover:scale-x-101 hover:scale-y-101
    transition-transform duration-300
  `;

  const highlightedStyles = `
    border-emerald-400 ring-emerald-100 
    scale-[1.02] z-10
    lg:-mt-8
    hover:scale-x-103 hover:scale-y-103
  `;

  const normalStyles = `
    border-slate-200 hover:border-slate-300 hover:shadow-lg
  `;

  const badgeStyles = `
    absolute -top-3 left-1/2 -translate-x-1/2
    px-3 py-1 rounded-full text-xs font-bold
    bg-emerald-500 text-white shadow-lg
  `;

  const ctaVariants: Record<string, string> = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-200",
    secondary: "bg-slate-900 hover:bg-slate-800 text-white",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500",
  };

  return (
    <div className={`${cardBase} ${isHighlighted ? highlightedStyles : normalStyles}`}>
      {isHighlighted && (
        <span className={badgeStyles}>Mais popular</span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900">
            {formatPrice(plan.price)}
          </span>
          {plan.period && <span className="text-slate-500">{plan.period}</span>}
        </div>
        <p className="mt-1 text-sm text-slate-500">{formatMaxEmployees(plan.maxEmployees)}</p>
      </div>

      <ul className="flex-1 space-y-3 mb-8" role="list">
        {plan.features.map((feature: PlanFeature, index: number) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded ${
                feature.included
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
              aria-hidden="true"
            >
              {feature.included ? (
                <svg
                  className="w-4 h-4 mx-auto my-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 mx-auto my-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </span>
            <span
              className={`text-sm ${
                feature.included ? "text-slate-700" : "text-slate-400 line-through"
              }`}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onCtaClick ?? (() => {})}
        className={` cursor-pointer
          w-full rounded-xl px-6 py-3.5 text-base font-semibold
          transition-all duration-200 active:scale-[0.98]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          ${ctaVariants[plan.ctaVariant]}
          ${plan.ctaVariant === "primary" ? "focus-visible:outline-emerald-600" : ""}
          ${plan.ctaVariant === "secondary" ? "focus-visible:outline-slate-900" : ""}
          ${plan.ctaVariant === "outline" ? "focus-visible:outline-emerald-600" : ""}
        `}
      >
        {plan.ctaText}
      </button>
    </div>
  );
}
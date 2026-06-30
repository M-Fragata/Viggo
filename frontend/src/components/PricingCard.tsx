import { type PlanData, type PlanFeature, formatPrice, formatMaxEmployees } from "../../../shared/plans";

interface PricingCardProps {
  plan: PlanData;
  onCtaClick?: () => void;
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 mx-auto my-auto"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="w-4 h-4 mx-auto my-auto"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function PricingCard({ plan, onCtaClick }: PricingCardProps) {
  const isHighlighted = plan.highlighted;

  return (
    <div
      className={`
        relative rounded-lg p-8 bg-[#3a3a3c] flex flex-col h-full transition-all duration-300 border-1 hover:scale-101
        ${isHighlighted
          ? "border-1 border-[#00d4a4] shadow-[0_8px_24px_rgba(0,212,164,0.08)] lg:-mt-8 z-10 hover:border-2"
          : "border-[#888888] hover:border-[#d4d4d4] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        }
      `}
    >
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-[#00d4a4] text-[#0a0a0a] shadow-[0_4px_12px_rgba(0,212,164,0.2)]">
          Mais popular
        </span>
      )}

      <div className="mb-8">
        <h3 className="text-3xl font-semibold text-[#f7f7f7] leading-snug">{plan.name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-5xl font-semibold text-[#f7f7f7] leading-[1.1]">
            {formatPrice(plan.price)}
          </span>
          {plan.period && <span className="text-[#5a5a5c]">{plan.period}</span>}
        </div>
        <p className="mt-2 text-sm text-[#5a5a5c]">{formatMaxEmployees(plan.maxEmployees)}</p>
      </div>

      <ul className="flex-1 space-y-4 mb-10" role="list">
        {plan.features.map((feature: PlanFeature, index: number) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full ${
                feature.included
                  ? "bg-[#00d4a4]/15 text-[#00d4a4]"
                  : "bg-[#0a0a0a]/5 text-[#a8a8aa]"
              }`}
              aria-hidden="true"
            >
              {feature.included ? <CheckIcon /> : <CrossIcon />}
            </span>
            <span
              className={`text-sm leading-relaxed ${
                feature.included ? "text-[#1c1c1e]" : "text-[#a8a8aa] line-through"
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
        className={`cursor-pointer w-full rounded-full px-6 py-3.5 text-sm font-medium
          transition-all duration-200 active:scale-[0.98]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          ${plan.ctaVariant === "primary"
            ? "bg-[#0a0a0a] text-white hover:bg-[#1c1c1e] focus-visible:outline-[#0a0a0a] border border-[#00d4a4]"
            : plan.ctaVariant === "secondary"
            ? "bg-white text-[#0a0a0a] hover:bg-[#f7f7f7] focus-visible:outline-white"
            : "border border-[#888888] bg-[#0a0a0a] text-[#fff] hover:bg-[#0a0a0a]/10 focus-visible:outline-[#00d4a4]"
          }`}
      >
        {plan.ctaText}
      </button>
    </div>
  );
}
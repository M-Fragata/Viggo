import { useRef, useEffect } from "react";
import { type PlanData, type PlanFeature, formatPrice, formatMaxEmployees } from "../../../shared/plans";
import { gsap } from "gsap";

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
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              cardRef.current,
              { opacity: 0, y: 60 },
              {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power3.out",
                clearProps: "transform",
              }
            );
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`
        relative rounded-lg p-8 bg-canvas flex flex-col h-full transition-all duration-300 border-1 hover:scale-101 opacity-0
        ${isHighlighted
          ? "border-1 border-brand-green shadow-[0_8px_24px_rgba(0,212,164,0.08)] lg:-mt-8 z-10 hover:border-2"
          : "border-hairline hover:border-stone hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        }
      `}
    >
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-brand-green text-primary shadow-[0_4px_12px_rgba(0,212,164,0.2)]">
          Mais popular
        </span>
      )}

      <div className="mb-8">
        <h3 className="text-3xl font-semibold text-ink leading-snug">{plan.name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-5xl font-semibold text-ink leading-[1.1]">
            {formatPrice(plan.price)}
          </span>
          {plan.period && <span className="text-steel">{plan.period}</span>}
        </div>
        <p className="mt-2 text-sm text-steel">{formatMaxEmployees(plan.maxEmployees)}</p>
      </div>

      <ul className="flex-1 space-y-4 mb-10" role="list">
        {plan.features.map((feature: PlanFeature, index: number) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full ${
                feature.included
                  ? "bg-brand-green/15 text-brand-green"
                  : "bg-ink/5 text-muted"
              }`}
              aria-hidden="true"
            >
              {feature.included ? <CheckIcon /> : <CrossIcon />}
            </span>
            <span
              className={`text-sm leading-relaxed ${
                feature.included ? "text-charcoal" : "text-muted line-through"
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
          
          ${plan.ctaVariant === "primary"
            ? "bg-primary text-on-primary hover:bg-brand-green-deep focus-visible:outline-primary border border-brand-green"
            : plan.ctaVariant === "secondary"
            ? "bg-canvas text-primary hover:bg-surface focus-visible:outline-canvas border border-hairline"
            : "border border-hairline bg-canvas text-ink hover:bg-surface focus-visible:outline-primary"
          }`}
      >
        {plan.ctaText}
      </button>
    </div>
  );
}
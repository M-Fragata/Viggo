import { useRef, useEffect } from "react";
import { type PlanData, type PlanFeature, formatPrice, formatMaxEmployees } from "../../../shared/plans";
import { gsap } from "gsap";
import SpecularButton from "./SpecularButton";
import { useTheme } from "../hooks/useTheme";

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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
        relative rounded-2xl p-8 bg-white dark:bg-[#121214] flex flex-col transition-all duration-300 border hover:scale-101 opacity-0 shadow-sm dark:shadow-none
        ${isHighlighted
          ? "border-brand-green shadow-[0_8px_24px_rgba(0,212,164,0.12)] lg:-mt-8 z-10 hover:border-2"
          : "border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:shadow-md"
        }
      `}
    >
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-brand-green text-black shadow-[0_4px_12px_rgba(0,212,164,0.2)]">
          Mais popular
        </span>
      )}

      <div className="mb-8">
        <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white leading-snug">{plan.name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-semibold text-slate-900 dark:text-white leading-[1.1]">
            {formatPrice(plan.price)}
          </span>
          {plan.period && <span className="text-slate-500 dark:text-steel text-sm">{plan.period}</span>}
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-steel">{formatMaxEmployees(plan.maxEmployees)}</p>
      </div>

      <ul className="flex-1 space-y-4 mb-10" role="list">
        {plan.features.map((feature: PlanFeature, index: number) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className={`shrink-0 w-5 h-5 mt-0.5 rounded-full ${
                feature.included
                  ? "bg-brand-green/15 text-brand-green"
                  : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-muted"
              }`}
              aria-hidden="true"
            >
              {feature.included ? <CheckIcon /> : <CrossIcon />}
            </span>
            <span
              className={`text-sm leading-relaxed ${
                feature.included ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-muted line-through"
              }`}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {plan.ctaVariant === "primary" ? (
        <SpecularButton
          type="button"
          onClick={onCtaClick ?? (() => {})}
          size="md"
          radius={24}
          tint="#ffffff0c"
          tintOpacity={0.9}
          textColor={isDark ? "#ffffff" : "#000000"}
          lineColor="#00d4a4"
          baseColor="#00d4a4"
          intensity={1.5}
          shineSize={14}
          shineFade={35}
          thickness={1.5}
          speed={0.4}
          followMouse={true}
          proximity={200}
          className="w-full font-bold text-sm shadow-lg shadow-brand-green/15 cursor-pointer"
        >
          {plan.ctaText}
        </SpecularButton>
      ) : (
        <button
          type="button"
          onClick={onCtaClick ?? (() => {})}
          className="cursor-pointer w-full rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10"
        >
          {plan.ctaText}
        </button>
      )}
    </div>
  );
}
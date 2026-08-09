import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { gsap } from "gsap";
import { PLANS, getHighlightedPlan } from "../../../shared/plans";
import { PricingCard } from "./PricingCard";
import { PricingCalculator } from "./PricingCalculator";
import { TextSplitter } from "../utils/textSplitter";

export function PricingSection() {
  const navigate = useNavigate();
  const highlightedPlan = getHighlightedPlan();
  const otherPlans = PLANS.filter((p) => !p.highlighted);
  const [showCalculator, setShowCalculator] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const bottomBoxRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);

  const handleCtaClick = (planId: string) => {
    if (planId === "ENTERPRISE_CUSTOM") {
      navigate("/planos/custom");
    } else {
      navigate("/company/signup");
    }
  };

  const handleShowCalculator = () => {
    setShowCalculator((prev) => {
      const next = !prev;
      setTimeout(() => {
        if (next) {
          calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          bottomBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return next;
    });
  };

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Title split words
            if (titleRef.current) {
              gsap.fromTo(titleRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 },
              );

              const titleSplitter = new TextSplitter(titleRef.current, {
                type: "words",
                wordsClass: "word",
              });
              const titleWords = titleSplitter.getElements();
              gsap.from(titleWords, {
                opacity: 0,
                y: 20,
                stagger: 0.06,
                duration: 0.5,
                ease: "power3.out",
              });
            }

            // Paragraph split lines
            if (paragraphRef.current) {
              gsap.fromTo(paragraphRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 },
              );

              const paraSplitter = new TextSplitter(paragraphRef.current, {
                type: "lines",
                linesClass: "line",
              });
              const lines = paraSplitter.getElements();
              gsap.from(lines, {
                opacity: 0,
                y: 15,
                stagger: 0.1,
                duration: 0.4,
                delay: 0.3,
                ease: "power3.out",
              });
            }

            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!bottomBoxRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              bottomBoxRef.current!,
              { opacity: 0, y: 40 },
              {
                opacity: 1,
                y: 0,
                duration: 0.5,
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

    observer.observe(bottomBoxRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-10 lg:py-24 bg-canvas-dark"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <header className="text-center mb-16">
          <h2
            ref={titleRef}
            id="pricing-heading"
            className="text-4xl font-semibold tracking-tight text-on-dark leading-[1.2] opacity-0"
          >
            Planos simples e transparentes
          </h2>
          <p
            ref={paragraphRef}
            className="mt-4 text-lg leading-relaxed text-on-dark-muted max-w-2xl mx-auto opacity-0"
          >
            Todos os planos incluem trial de 30 dias, sem cartão de crédito.
            Cancele quando quiser.
          </p>
        </header>

        <div className="relative">
          <div
            className={`
              grid gap-8
              lg:grid-cols-2
              lg:items-start
              ${highlightedPlan ? "lg:pt-8" : ""}
            `}
            role="list"
          >
            {highlightedPlan && (
              <PricingCard
                key={highlightedPlan.id}
                plan={highlightedPlan}
                onCtaClick={() => handleCtaClick(highlightedPlan.id)}
              />
            )}

            {otherPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                onCtaClick={() => handleCtaClick(plan.id)}
              />
            ))}
          </div>
        </div>

        <div ref={bottomBoxRef} className="mt-16 opacity-0">
          <div className="rounded-lg border border-hairline bg-surface p-8 md:p-12 text-center">
            <div className="mx-auto max-w-2xl">
              <h3 className="text-3xl font-semibold text-ink leading-snug sm:text-4xl">
                Ficou com alguma dúvida sobre os valores?
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-steel">
                Use nossa calculadora para estimar o custo ideal para sua empresa.
              </p>
              <div className="mt-8">
                <button
                  onClick={handleShowCalculator}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-on-primary hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors cursor-pointer"
                >
                  {showCalculator ? "Ocultar calculadora" : "Ver calculadora de preços"}
                </button>
              </div>
              {showCalculator && (
                <div ref={calculatorRef} className="mt-10 flex justify-center">
                  <div className="w-full">
                    <PricingCalculator />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

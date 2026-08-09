import { useRef, useEffect } from "react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";
import { TRIAL_DAYS } from "../../../shared/plans";

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.2 });

            // Title split words
            if (titleRef.current) {
              tl.fromTo(titleRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 },
              );

              const titleSplitter = new TextSplitter(titleRef.current, {
                type: "words",
                wordsClass: "word",
              });
              const titleWords = titleSplitter.getElements();
              tl.fromTo(titleWords,
                { opacity: 0, y: 20 },
                {
                  opacity: 1,
                  y: 0,
                  stagger: 0.06,
                  duration: 0.5,
                  clearProps: "transform",
                },
                "-=0.01"
              );
            }

            // Paragraph split lines
            if (paragraphRef.current) {
              tl.fromTo(paragraphRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 },
              );

              const paraSplitter = new TextSplitter(paragraphRef.current, {
                type: "lines",
                linesClass: "line",
              });
              const lines = paraSplitter.getElements();
              tl.fromTo(lines,
                { opacity: 0, y: 15 },
                {
                  opacity: 1,
                  y: 0,
                  stagger: 0.1,
                  duration: 0.4,
                  clearProps: "transform",
                },
                "-=0.1"
              );
            }

            // Button fade in
            if (buttonRef.current) {
              tl.fromTo(buttonRef.current,
                { opacity: 0, y: 20, scale: 0.9 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.5,
                  clearProps: "transform",
                },
                "-=0.1"
              );
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

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-canvas-dark"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8 text-center">
        <h2
          ref={titleRef}
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-on-dark leading-[1.2] opacity-0"
        >
          Pronto para modernizar seu controle de ponto?
        </h2>
        <p
          ref={paragraphRef}
          className="mt-4 text-lg leading-relaxed text-on-dark-muted max-w-2xl mx-auto opacity-0"
        >
          Crie sua conta em minutos. Trial gratuito de {TRIAL_DAYS} dias, sem cartão de crédito.
        </p>
        <div ref={buttonRef} className="mt-10 opacity-0">
          <Link
            to="/company/signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-medium text-primary hover:bg-brand-green-deep
            hover:text-white focus-visible:outline-brand-green transition-colors"
          >
            Criar minha empresa grátis
          </Link>
        </div>
      </div>
    </section>
  );
}

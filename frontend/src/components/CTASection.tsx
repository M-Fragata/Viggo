import { useRef, useEffect } from "react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";
import { TRIAL_DAYS } from "../../../shared/plans";
import { trackEvent } from "../utils/metrics";
import SpecularButton from "./SpecularButton";
import { useTheme } from "../hooks/useTheme";

export function CTASection() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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

            // Title split chars
            if (titleRef.current) {
              tl.fromTo(titleRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 },
              );

              const titleSplitter = new TextSplitter(titleRef.current, {
                type: "chars",
                charsClass: "char",
              });
              const titleChars = titleSplitter.getElements();
              tl.fromTo(titleChars,
                { opacity: 0, y: 20, rotateX: -30 },
                {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  stagger: 0.015,
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
      className="py-24 bg-white dark:bg-canvas-dark border-t border-slate-200 dark:border-white/5 transition-colors duration-200"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8 text-center">
        <h2
          ref={titleRef}
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-on-dark leading-[1.2] opacity-0"
        >
          Pronto para modernizar seu controle de ponto?
        </h2>
        <p
          ref={paragraphRef}
          className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-on-dark-muted max-w-2xl mx-auto opacity-0"
        >
          Crie sua conta em minutos. Trial gratuito de {TRIAL_DAYS} dias, sem cartão de crédito.
        </p>
        <div ref={buttonRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0">
          <Link
            to="/company/signup"
            onClick={() => trackEvent("cta_click", { ctaId: "cta-criar-empresa-gratis", path: "/page" })}
            className="w-full sm:w-auto inline-flex items-center justify-center"
          >
            <SpecularButton
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
              className="w-full sm:w-auto font-bold text-sm shadow-lg shadow-brand-green/15 cursor-pointer"
            >
              Criar minha empresa grátis
            </SpecularButton>
          </Link>
          <a
            href="https://wa.me/5521966921215?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20algumas%20d%C3%BAvidas%20sobre%20o%20Viggo%20antes%20de%20criar%20minha%20conta."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.04] backdrop-blur-md px-7 py-3.5 text-sm font-semibold text-slate-800 dark:text-on-dark hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:hover:bg-white/[0.08] dark:hover:border-brand-green/50 dark:hover:text-brand-green transition-all shadow-sm dark:shadow-none group"
          >
            <svg className="w-4 h-4 fill-current text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>Falar no WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}

import { useRef, useEffect } from "react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";
import { UserPlus, Settings2, Smartphone, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { TRIAL_DAYS } from "../../../shared/plans";
import SpecularButton from "./SpecularButton";
import { useTheme } from "../hooks/useTheme";

const STEPS = [
  {
    step: "01",
    icon: UserPlus,
    title: "Crie sua conta em 1 minuto",
    description: "Cadastre sua empresa sem burocracia e sem precisar de cartão de crédito. Seu período de teste de 30 dias é liberado instantaneamente.",
    highlights: ["Sem cartão de crédito", "Acesso total aos recursos", "Ambiente seguro na nuvem"]
  },
  {
    step: "02",
    icon: Settings2,
    title: "Cadastre jornadas e equipe",
    description: "Defina os horários de trabalho e cadastre seus colaboradores manualmente ou importe planilhas. Nosso time pode te ajudar na migração!",
    highlights: ["Importação em lote", "Suporte humano assistido", "Configuração de banco de horas"]
  },
  {
    step: "03",
    icon: Smartphone,
    title: "Comece a registrar ponto",
    description: "Seus colaboradores registram o ponto via aplicativo móvel ou através do Totem compartilhado na portaria com IA facial e liveness.",
    highlights: ["Reconhecimento facial ativo", "Cerca virtual com GPS", "Funciona mesmo offline"]
  }
];

export function HowItWorks() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });

            if (badgeRef.current) {
              tl.fromTo(
                badgeRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, clearProps: "transform" }
              );
            }

            if (titleRef.current) {
              tl.fromTo(
                titleRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 }
              );

              const titleSplitter = new TextSplitter(titleRef.current, {
                type: "chars",
                charsClass: "char"
              });
              const titleChars = titleSplitter.getElements();

              tl.fromTo(
                titleChars,
                { opacity: 0, y: 20, rotateX: -30 },
                {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  stagger: 0.015,
                  duration: 0.5,
                  clearProps: "transform"
                },
                "-=0.2"
              );
            }

            if (paragraphRef.current) {
              tl.fromTo(
                paragraphRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 }
              );

              const paraSplitter = new TextSplitter(paragraphRef.current, {
                type: "words",
                wordsClass: "word"
              });
              const paraWords = paraSplitter.getElements();

              tl.fromTo(
                paraWords,
                { opacity: 0, y: 15 },
                {
                  opacity: 1,
                  y: 0,
                  stagger: 0.02,
                  duration: 0.4,
                  clearProps: "transform"
                },
                "-=0.2"
              );
            }

            if (stepsContainerRef.current) {
              tl.fromTo(
                stepsContainerRef.current.children,
                { opacity: 0, y: 35, scale: 0.95 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  stagger: 0.12,
                  duration: 0.55,
                  ease: "power3.out",
                  clearProps: "transform"
                },
                "-=0.15"
              );
            }

            if (ctaRef.current) {
              tl.fromTo(
                ctaRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.45, clearProps: "transform" },
                "-=0.1"
              );
            }

            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="como-funciona"
      className="py-20 lg:py-28 bg-white dark:bg-canvas-dark relative overflow-hidden border-t border-slate-200 dark:border-white/5 transition-colors duration-200"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-green/5 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            ref={badgeRef}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 border border-brand-green/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-green mb-4 opacity-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Implantação Descomplicada
          </span>
          <h2
            ref={titleRef}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-on-dark leading-tight opacity-0"
          >
            Comece a rodar o Ponto Fragata em <span className="text-brand-green">3 passos simples</span>
          </h2>
          <p
            ref={paragraphRef}
            className="mt-4 text-base sm:text-lg text-slate-600 dark:text-on-dark-muted leading-relaxed opacity-0"
          >
            Sem técnicos demorados, sem comprar relógios de ponto caros e sem complicação. Sua empresa pronta para operar hoje mesmo.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div ref={stepsContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {STEPS.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="relative rounded-3xl bg-slate-50 dark:bg-white/[0.025] border border-slate-200 dark:border-white/10 p-7 sm:p-8 flex flex-col justify-between hover:border-brand-green/30 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-all duration-300 group opacity-0 shadow-sm dark:shadow-lg"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3.5 rounded-2xl bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-black transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-4xl font-extrabold font-mono text-slate-300 dark:text-white/15 group-hover:text-brand-green/40 dark:group-hover:text-brand-green/30 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-on-dark mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-on-dark-muted leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                {/* Checklist highlights */}
                <div className="pt-5 border-t border-slate-200 dark:border-white/5 space-y-2.5">
                  {item.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-on-dark-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-green shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Helper */}
        <div ref={ctaRef} className="mt-12 text-center opacity-0 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/company/signup"
            className="inline-flex items-center justify-center"
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
              className="font-bold text-sm shadow-lg shadow-brand-green/15 cursor-pointer inline-flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-2">
                Iniciar teste grátis de {TRIAL_DAYS} dias
                <ArrowRight className="w-4 h-4" />
              </span>
            </SpecularButton>
          </Link>
          <span className="text-xs text-on-dark-muted">
            Configuração assistida gratuita inclusa
          </span>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;

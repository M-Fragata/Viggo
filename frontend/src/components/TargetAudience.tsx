import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";
import {
  Briefcase,
  Store,
  Stethoscope,
  Laptop,
  Factory,
  Users2
} from "lucide-react";

const AUDIENCES = [
  {
    icon: Briefcase,
    category: "Terceirizações & Facilities",
    badge: "Geolocalização + Cerca Virtual",
    points: ["Auditoria de localização precisa", "Zero fraude de marcação"],
  },
  {
    icon: Store,
    category: "Comércio & Varejo",
    badge: "Fim das Bobinas de Papel",
    points: ["Marcação em 2 segundos", "Escalas 6x1 automáticas"],
  },
  {
    icon: Stethoscope,
    category: "Clínicas & Saúde",
    badge: "100% Contactless",
    points: ["Escalas complexas e plantões", "Sem contato físico"],
  },
  {
    icon: Laptop,
    category: "Escritórios & TI",
    badge: "Home Office & Híbrido",
    points: ["Banco de horas em tempo real", "Atestados com 1 clique"],
  },
  {
    icon: Factory,
    category: "Indústria & Construção",
    badge: "Operação 100% Offline",
    points: ["Modo Totem em qualquer tablet", "Sincronização automática"],
  },
];

export function TargetAudience() {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

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
                charsClass: "char",
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
                  clearProps: "transform",
                },
                "-=0.2"
              );
            }

            if (cardsRef.current) {
              tl.fromTo(
                Array.from(cardsRef.current.children),
                { opacity: 0, y: 25, scale: 0.96 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  stagger: 0.08,
                  duration: 0.45,
                  ease: "power3.out",
                  clearProps: "transform",
                },
                "-=0.15"
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
      id="para-quem-e"
      className="py-16 lg:py-20 bg-slate-50 dark:bg-canvas-dark relative overflow-hidden border-t border-slate-200 dark:border-white/5 transition-colors duration-200"
    >
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-brand-green/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span
            ref={badgeRef}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 border border-brand-green/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-green mb-4 opacity-0"
          >
            <Users2 className="w-3.5 h-3.5" />
            Soluções Sob Medida
          </span>
          <h2
            ref={titleRef}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-on-dark leading-tight opacity-0"
          >
            O controle de ponto perfeito para{" "}
            <span className="text-brand-green">o seu modelo de negócio</span>
          </h2>
        </div>

        {/*
          Mobile:  flex + overflow-x-auto (horizontal scroll, snap)
          sm:      2-column grid
          lg:      5-column grid (one card per segment)
        */}
        <div
          ref={cardsRef}
          className="
            flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0
            lg:grid-cols-5
          "
        >
          {AUDIENCES.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="
                  snap-start shrink-0 w-[220px]
                  sm:w-auto
                  rounded-2xl bg-white dark:bg-white/[0.025]
                  border border-slate-200 dark:border-white/10
                  p-5 flex flex-col gap-3
                  hover:border-brand-green/40 hover:shadow-lg hover:shadow-brand-green/5
                  dark:hover:bg-white/[0.04]
                  transition-all duration-300 group opacity-0
                "
              >
                {/* Icon + Category */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-black transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-on-dark leading-snug">
                    {item.category}
                  </h3>
                </div>

                {/* Badge */}
                <span className="self-start text-[10px] font-semibold text-brand-green bg-brand-green/10 border border-brand-green/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  {item.badge}
                </span>

                {/* Points */}
                <ul className="space-y-1.5 mt-auto">
                  {item.points.map((pt, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-on-dark-muted leading-tight"
                    >
                      <span className="text-brand-green mt-0.5 shrink-0">✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TargetAudience;

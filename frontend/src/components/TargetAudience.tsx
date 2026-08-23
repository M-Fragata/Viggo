import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";
import {
  Briefcase,
  Store,
  Stethoscope,
  Laptop,
  Factory,
  Check,
  Sparkles,
  Users2
} from "lucide-react";

const AUDIENCES = [
  {
    icon: Briefcase,
    category: "Terceirizações & Facilities",
    headline: "Controle equipes externas em tempo real",
    description: "Ideal para empresas de limpeza, segurança, manutenção e logística. Garanta que o colaborador está no posto com geolocalização e foto biométrica.",
    badge: "Geolocalização + Cerca Virtual",
    points: [
      "Auditoria de localização precisa",
      "Foto do colaborador no local",
      "Zero fraude de marcação por terceiros"
    ]
  },
  {
    icon: Store,
    category: "Comércio & Varejo",
    headline: "Trocas de turno rápidas e sem filas",
    description: "Perfeito para lojas, restaurantes e redes comerciais. Elimine relógios com bobinas de papel que quebram e geram custos contínuos.",
    badge: "Fim das Bobinas de Papel",
    points: [
      "Marcação em 2 segundos",
      "Escalas 6x1 e folgas automáticas",
      "Sem custo de manutenção mecânica"
    ]
  },
  {
    icon: Stethoscope,
    category: "Clínicas, Consultórios & Saúde",
    headline: "Escalas 12x36 e biometria sem toque",
    description: "Atenda hospitais, clínicas e laboratórios com higiene total através do reconhecimento facial contactless e gestão de plantões.",
    badge: "100% Contactless & Higiênico",
    points: [
      "Escalas complexas e plantões",
      "Sem contato físico com equipamentos",
      "Conformidade rigorosa para o setor"
    ]
  },
  {
    icon: Laptop,
    category: "Escritórios, Agências & TI",
    headline: "Flexibilidade para Home Office e Híbrido",
    description: "Para equipes que trabalham no escritório ou em regime remoto. Controle de jornada transparente, banco de horas automático e solicitações de ajuste sem papel.",
    badge: "Home Office & Híbrido",
    points: [
      "Acesso web e smartphone",
      "Banco de horas em tempo real",
      "Atestados e abonos com 1 clique"
    ]
  },
  {
    icon: Factory,
    category: "Indústria & Construção Civil",
    headline: "Totem Kiosk robusto que funciona offline",
    description: "Canteiros de obras e fábricas utilizam tablets compartilhados como Totem de ponto. Se a internet cair, o Viggo grava local e sincroniza sozinho.",
    badge: "Operação 100% Offline",
    points: [
      "Modo Totem em qualquer tablet",
      "Armazenamento local criptografado",
      "Sincronização automática na nuvem"
    ]
  }
];

export function TargetAudience() {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
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

            if (cardsRef.current) {
              tl.fromTo(
                cardsRef.current.children,
                { opacity: 0, y: 35, scale: 0.96 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  stagger: 0.1,
                  duration: 0.55,
                  ease: "power3.out",
                  clearProps: "transform"
                },
                "-=0.15"
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
      id="para-quem-e"
      className="py-20 lg:py-28 bg-canvas-dark relative overflow-hidden border-t border-white/5"
    >
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-brand-green/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[450px] h-[450px] bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            ref={badgeRef}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 border border-brand-green/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-green mb-4 opacity-0"
          >
            <Users2 className="w-3.5 h-3.5" />
            Soluções Sob Medida
          </span>
          <h2
            ref={titleRef}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-dark leading-tight opacity-0"
          >
            O controle de ponto perfeito para <span className="text-brand-green">o seu modelo de negócio</span>
          </h2>
          <p
            ref={paragraphRef}
            className="mt-4 text-base sm:text-lg text-on-dark-muted leading-relaxed opacity-0"
          >
            De pequenas equipes locais a grandes operações externas com centenas de colaboradores, o Viggo se adapta à rotina da sua empresa.
          </p>
        </div>

        {/* Audience Cards Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AUDIENCES.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className={`rounded-3xl bg-white/[0.02] border border-white/10 p-7 flex flex-col justify-between hover:border-brand-green/30 hover:bg-white/[0.035] transition-all duration-300 group opacity-0 shadow-lg ${
                  index === 4 ? "md:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="p-3 rounded-2xl bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-black transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-brand-green bg-brand-green/10 border border-brand-green/20 px-2.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-brand-green uppercase tracking-wider mb-1">
                    {item.category}
                  </h3>
                  <h4 className="text-lg font-bold text-on-dark mb-2.5 leading-snug">
                    {item.headline}
                  </h4>
                  <p className="text-xs text-on-dark-muted leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                {/* Key Benefits List */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  {item.points.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-on-dark/80">
                      <div className="w-4 h-4 rounded-full bg-brand-green/15 text-brand-green flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TargetAudience;

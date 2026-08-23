import { useRef, useEffect } from "react";
import { 
  ScanFace, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  TabletSmartphone, 
  Sparkles, 
  FileSpreadsheet
} from "lucide-react";
import { gsap } from "gsap";
import { MagicBento, type BentoCardProps } from "./MagicBento";
import { TextSplitter } from "../utils/textSplitter";

const BENTO_CARDS: BentoCardProps[] = [
  {
    label: "Anti-Fraude com IA",
    title: "Reconhecimento Facial com Liveness Ativo",
    description: "Nossa IA valida micro-expressões em tempo real, impedindo que funcionários usem fotos estáticas, vídeos ou batam ponto pelo colega.",
    icon: <ScanFace className="w-6 h-6" />,
    colSpan: "md:col-span-2 lg:col-span-2",
    tags: ["Validação em < 1s", "Prova de Vida Real", "Biometria Criptografada"]
  },
  {
    label: "Precisão GPS",
    title: "Cerca Virtual & Geolocalização",
    description: "Defina o raio permitido para cada filial ou equipe externa. O sistema armazena a localização exata de cada registro com auditoria no mapa.",
    icon: <MapPin className="w-6 h-6 text-brand-tag" />,
    colSpan: "md:col-span-1 lg:col-span-1",
    tags: ["Raio customizável (ex: 50m)", "Auditoria GPS no mapa"]
  },
  {
    label: "Automação RH",
    title: "Cálculo Automático de Horas",
    description: "Horas extras, adicionais noturnos e atrasos calculados em tempo real de acordo com as regras da sua empresa. Diga adeus às planilhas manuais.",
    icon: <Clock className="w-6 h-6 text-emerald-400" />,
    colSpan: "md:col-span-1 lg:col-span-1",
    tags: ["Banco de horas automático", "DSR & Adicionais"]
  },
  {
    label: "Segurança Jurídica",
    title: "100% Homologado Portaria 671 MTE",
    description: "Sistema REP-P em total conformidade legal. Comprovante de ponto assinado digitalmente, inviolável e com emissão de arquivos fiscais (AFD/AFDT) para o Ministério do Trabalho.",
    icon: <ShieldCheck className="w-6 h-6 text-amber-400" />,
    colSpan: "md:col-span-2 lg:col-span-2",
    tags: ["Zero passivos trabalhistas", "Assinatura Digital ICP-Brasil"]
  },
  {
    label: "Flexibilidade",
    title: "App Mobile ou Modo Totem",
    description: "Use no smartphone dos colaboradores ou transforme um tablet na recepção em um quiosque inteligente com troca ultra-rápida de perfil.",
    icon: <TabletSmartphone className="w-6 h-6 text-blue-400" />,
    colSpan: "md:col-span-1 lg:col-span-1",
    tags: ["Android & iOS", "Sem aparelhos caros"]
  },
  {
    label: "Integração Contábil",
    title: "Fechamento de Folha em 1 Clique",
    description: "Exporte dados formatados diretamente para os sistemas da sua contabilidade (Domínio, TOTVS, Alterdata, Senior, Fortes, Questor) e economize até 80% do tempo.",
    icon: <FileSpreadsheet className="w-6 h-6 text-purple-400" />,
    colSpan: "md:col-span-2 lg:col-span-2",
    tags: ["Layouts contábeis oficiais", "Economia de 40h/mês"]
  }
];

export function BentoGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

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
                { opacity: 0, y: 15, scale: 0.95 },
                { opacity: 1, y: 0, scale: 1, duration: 0.4, clearProps: "transform" }
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
                { opacity: 0, y: 20, rotateX: -40 },
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

            // Cards entrance
            const cards = sectionRef.current!.querySelectorAll(".bento-section .card");
            if (cards.length > 0) {
              tl.fromTo(
                cards,
                { opacity: 0, y: 35, scale: 0.95 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  stagger: 0.08,
                  duration: 0.55,
                  ease: "power3.out",
                  clearProps: "transform"
                },
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
    <section ref={sectionRef} className="py-20 lg:py-28 bg-canvas-dark relative overflow-hidden" id="funcionalidades">
      {/* Subtle background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-green/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span 
            ref={badgeRef}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 border border-brand-green/20 px-3.5 py-1 text-xs font-medium text-brand-green mb-4 opacity-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Por que empresas escolhem o Viggo
          </span>
          <h2 
            ref={titleRef}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-dark leading-tight opacity-0"
          >
            Tudo o que sua empresa precisa para <span className="text-brand-green">blindar o RH</span> contra fraudes e passivos.
          </h2>
          <p 
            ref={paragraphRef}
            className="mt-4 text-base sm:text-lg text-on-dark-muted leading-relaxed opacity-0"
          >
            Elimine relógios de ponto caros que quebram com frequência. O Viggo transforma qualquer smartphone ou tablet em um sistema de ponto seguro, moderno e auditável.
          </p>
        </div>

        {/* MagicBento Grid Component without stars, clickEffect, tilt and magnetism */}
        <MagicBento 
          cards={BENTO_CARDS}
          enableStars={false}
          clickEffect={false}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={false}
          enableMagnetism={false}
          spotlightRadius={320}
          glowColor="0, 212, 164"
        />
      </div>
    </section>
  );
}

export default BentoGrid;


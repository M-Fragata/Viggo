import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  CheckCircle2, 
  ArrowRight 
} from "lucide-react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";
import SpecularButton from "./SpecularButton";
import { useTheme } from "../contexts/ThemeContext";

export function ManagerShowcase() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const sectionRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const ctaBtnRef = useRef<HTMLDivElement>(null);
  const mockupCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });

            // Metrics cards stagger
            if (metricsRef.current) {
              tl.fromTo(
                metricsRef.current.children,
                { opacity: 0, y: 30, scale: 0.95 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  stagger: 0.1,
                  duration: 0.5,
                  clearProps: "transform"
                }
              );
            }

            // Badge
            if (badgeRef.current) {
              tl.fromTo(
                badgeRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, clearProps: "transform" },
                "-=0.2"
              );
            }

            // Title split chars
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

            // Paragraph split words
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

            // Feature list items
            if (listRef.current) {
              tl.fromTo(
                listRef.current.children,
                { opacity: 0, x: -20 },
                {
                  opacity: 1,
                  x: 0,
                  stagger: 0.12,
                  duration: 0.4,
                  clearProps: "transform"
                },
                "-=0.2"
              );
            }

            // CTA Button
            if (ctaBtnRef.current) {
              tl.fromTo(
                ctaBtnRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, clearProps: "transform" },
                "-=0.1"
              );
            }

            // Mockup Card
            if (mockupCardRef.current) {
              tl.fromTo(
                mockupCardRef.current,
                { opacity: 0, x: 35, scale: 0.95 },
                {
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  duration: 0.6,
                  ease: "power3.out",
                  clearProps: "transform"
                },
                "-=0.3"
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
    <section ref={sectionRef} className="py-20 lg:py-28 bg-white dark:bg-canvas-dark relative border-t border-slate-200 dark:border-white/5 overflow-hidden transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        
        {/* Metric highlights */}
        <div ref={metricsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-20">
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 relative overflow-hidden opacity-0 shadow-xs dark:shadow-none">
            <div className="text-3xl sm:text-4xl font-extrabold text-brand-green mb-1">
              -80%
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-on-dark mb-1">
              Tempo no Fechamento
            </div>
            <p className="text-xs text-slate-500 dark:text-on-dark-muted">
              Chega de conferir folha por folha manualmente.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 relative overflow-hidden opacity-0 shadow-xs dark:shadow-none">
            <div className="text-3xl sm:text-4xl font-extrabold text-brand-tag mb-1">
              0%
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-on-dark mb-1">
              Fraudes de Identidade
            </div>
            <p className="text-xs text-slate-500 dark:text-on-dark-muted">
              Com reconhecimento facial ativo e liveness.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 relative overflow-hidden opacity-0 shadow-xs dark:shadow-none">
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-500 dark:text-amber-400 mb-1">
              R$ 0
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-on-dark mb-1">
              Gasto com Manutenção
            </div>
            <p className="text-xs text-slate-500 dark:text-on-dark-muted">
              Sem aparelhos físicos quebrados e sem bobinas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 relative overflow-hidden opacity-0 shadow-xs dark:shadow-none">
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-600 dark:text-purple-400 mb-1">
              100%
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-on-dark mb-1">
              Portaria 671 MTE
            </div>
            <p className="text-xs text-slate-500 dark:text-on-dark-muted">
              Conformidade total e relatórios fiscais oficiais.
            </p>
          </div>
        </div>

        {/* Two-column Feature / Visual Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div ref={badgeRef} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-semibold opacity-0">
              <BarChart3 className="w-4 h-4" />
              Painel de Controle em Tempo Real
            </div>

            <h3 ref={titleRef} className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-on-dark leading-tight opacity-0">
              Saiba exatamente quem está presente, atrasado ou ausente agora mesmo.
            </h3>

            <p ref={paragraphRef} className="text-base text-slate-600 dark:text-on-dark-muted leading-relaxed opacity-0">
              Tenha uma visão panorâmica de todas as filiais e equipes em campo. Aprove justificativas de falta, emita relatórios instantâneos e configure escalas personalizadas sem complicações.
            </p>

            <div ref={listRef} className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 opacity-0">
                <div className="p-1 rounded-full bg-brand-green/10 text-brand-green mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-on-dark">Alertas Instantâneos de Horas Extras e Atrasos</h4>
                  <p className="text-xs text-slate-500 dark:text-on-dark-muted">Evite custos inesperados na folha de pagamento.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-0">
                <div className="p-1 rounded-full bg-brand-green/10 text-brand-green mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-on-dark">Gestão Simplificada de Atestados e Justificativas</h4>
                  <p className="text-xs text-slate-500 dark:text-on-dark-muted">Colaboradores anexam atestados pelo app e o gestor aprova com 1 clique.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-0">
                <div className="p-1 rounded-full bg-brand-green/10 text-brand-green mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-on-dark">Espelho de Ponto Pronto para Assinatura Eletrônica</h4>
                  <p className="text-xs text-slate-500 dark:text-on-dark-muted">Documentos comprobatórios 100% digitais e válidos juridicamente.</p>
                </div>
              </div>
            </div>

            <div ref={ctaBtnRef} className="pt-4 opacity-0">
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
                    Experimente a gestão em tempo real
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </SpecularButton>
              </Link>
            </div>
          </div>

          {/* Interactive UI Mockup Card */}
          <div ref={mockupCardRef} className="lg:col-span-6 opacity-0">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-surface-code/80 backdrop-blur-xl p-6 shadow-xl dark:shadow-2xl relative overflow-hidden"
            >
              {/* Fake Dashboard Top Bar */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-xs text-slate-500 dark:text-on-dark-muted ml-2 font-mono">painel.viggo.com.br/tempo-real</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Ao Vivo
                </span>
              </div>

              {/* Fake Live Statistics */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none">
                  <div className="text-xs text-slate-500 dark:text-on-dark-muted">Presentes</div>
                  <div className="text-xl font-bold text-brand-green mt-0.5">48/50</div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none">
                  <div className="text-xs text-slate-500 dark:text-on-dark-muted">Em Intervalo</div>
                  <div className="text-xl font-bold text-amber-500 dark:text-amber-400 mt-0.5">12</div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none">
                  <div className="text-xs text-slate-500 dark:text-on-dark-muted">Atrasos</div>
                  <div className="text-xl font-bold text-rose-500 dark:text-rose-400 mt-0.5">2</div>
                </div>
              </div>

              {/* Fake Feed Activity */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-700 dark:text-on-dark-muted uppercase tracking-wider mb-2">
                  Últimos Registros Auditados
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold">
                      MF
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-on-dark">Matheus Fragata</div>
                      <div className="text-[11px] text-slate-500 dark:text-on-dark-muted">Matriz • Entrada (08:00)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">
                      Biometria 99.8%
                    </span>
                    <div className="text-[10px] text-slate-400 dark:text-on-dark-muted mt-0.5">GPS: Sede SP</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 dark:text-blue-400 flex items-center justify-center font-bold">
                      CS
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-on-dark">Carolina Silva</div>
                      <div className="text-[11px] text-slate-500 dark:text-on-dark-muted">Filial Sul • Almoço (12:05)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">
                      Biometria 99.4%
                    </span>
                    <div className="text-[10px] text-slate-400 dark:text-on-dark-muted mt-0.5">GPS: Cerca Ativa</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      RA
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-on-dark">Rodrigo Alves</div>
                      <div className="text-[11px] text-slate-500 dark:text-on-dark-muted">Equipe Externa • Saída (17:30)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">
                      Biometria 99.9%
                    </span>
                    <div className="text-[10px] text-slate-400 dark:text-on-dark-muted mt-0.5">GPS: Cliente ABC</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

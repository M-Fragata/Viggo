import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Cpu, Database, CheckCircle2, Award } from "lucide-react";
import { gsap } from "gsap";

const INTEGRATIONS = [
  { name: "Domínio Sistemas", category: "Folha & Contábil" },
  { name: "TOTVS RM & Protheus", category: "ERP & RH" },
  { name: "Alterdata Software", category: "Gestão Contábil" },
  { name: "Senior Sistemas", category: "HCM & Ponto" },
  { name: "Questor", category: "Folha de Pagamento" },
  { name: "Fortes Tecnologia", category: "Gestão Empresarial" },
  { name: "Contmatic Phoenix", category: "Contábil & RH" },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, title: "Portaria 671 MTE", subtitle: "100% Homologado" },
  { icon: Award, title: "LGPD Ready", subtitle: "Dados Biométricos Criptografados" },
  { icon: Cpu, title: "IA Facial Liveness", subtitle: "Anti-Fraude Ativo" },
  { icon: Database, title: "Exportação AFD/AFDT", subtitle: "Integração Imediata" },
];

export function Marquee() {
  const sectionRef = useRef<HTMLElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });

            if (badgesRef.current) {
              tl.fromTo(
                badgesRef.current.children,
                { opacity: 0, y: 25, scale: 0.95 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  stagger: 0.1,
                  duration: 0.5,
                  clearProps: "transform",
                }
              );
            }

            if (marqueeRef.current) {
              tl.fromTo(
                marqueeRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.5, clearProps: "transform" },
                "-=0.2"
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
    <section ref={sectionRef} className="py-12 bg-slate-50 dark:bg-canvas-dark border-y border-slate-200 dark:border-white/5 overflow-hidden relative transition-colors duration-200">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 bg-brand-green/5 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-8">
        <div ref={badgesRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {TRUST_BADGES.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none hover:border-brand-green/30 transition-all duration-300 group opacity-0"
              >
                <div className="p-2 rounded-lg bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-black transition-colors shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-on-dark leading-snug">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-on-dark-muted">
                    {badge.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={marqueeRef} className="relative flex overflow-x-hidden opacity-0">
        {/* Left & Right gradient fades for smooth marquee */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-slate-50 dark:from-canvas-dark to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-slate-50 dark:from-canvas-dark to-transparent pointer-events-none" />

        <div className="flex shrink-0 items-center justify-around gap-10 w-full overflow-hidden">
          <motion.div
            className="flex shrink-0 items-center gap-8 py-2"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 25,
            }}
          >
            {[...INTEGRATIONS, ...INTEGRATIONS, ...INTEGRATIONS].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-xs dark:shadow-none text-slate-700 dark:text-on-dark/70 hover:text-slate-900 dark:hover:text-on-dark hover:border-brand-green/40 transition-colors whitespace-nowrap text-xs font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                <span>{item.name}</span>
                <span className="text-[10px] text-brand-green/90 dark:text-brand-green/70 bg-brand-green/10 px-2 py-0.5 rounded-full">
                  {item.category}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

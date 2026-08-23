import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  UserCheck, 
  FileSpreadsheet, 
  ClipboardCheck, 
  Tablet, 
  CheckCircle2, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  Download, 
  Check, 
  X, 
  ScanFace,
  Sparkles
} from "lucide-react";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";

interface TabItem {
  id: string;
  badge: string;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  {
    id: "dashboard",
    badge: "Visão Geral",
    title: "Painel & Métricas da Empresa",
    shortDesc: "Acompanhe presenças, ausências e limites do plano em tempo real.",
    icon: LayoutDashboard,
  },
  {
    id: "presentes",
    badge: "Auditoria Ao Vivo",
    title: "Registros com Biometria & GPS",
    shortDesc: "Auditoria instantânea de cada marcação com prova de vida e cerca virtual.",
    icon: UserCheck,
  },
  {
    id: "folha",
    badge: "Portaria 671 MTE",
    title: "Fechamento de Folha & AFD",
    shortDesc: "Gere relatórios legais e arquivos AFD/AEJ com assinatura digital inviolável.",
    icon: FileSpreadsheet,
  },
  {
    id: "justificativas",
    badge: "Gestão Ágil",
    title: "Atestados & Justificativas",
    shortDesc: "Aprove atestados médicos e ajustes de ponto com 1 clique direto pelo sistema.",
    icon: ClipboardCheck,
  },
  {
    id: "totem",
    badge: "Quiosque Físico",
    title: "Modo Totem para Recepção",
    shortDesc: "Transforme qualquer tablet na entrada da empresa em ponto biométrico ultra-rápido.",
    icon: Tablet,
  },
];

export function AppShowcase() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [justificativaStatus, setJustificativaStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

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

            if (paragraphRef.current) {
              tl.fromTo(
                paragraphRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 }
              );

              const paraSplitter = new TextSplitter(paragraphRef.current, {
                type: "words",
                wordsClass: "word",
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
                  clearProps: "transform",
                },
                "-=0.2"
              );
            }

            if (tabsRef.current) {
              tl.fromTo(
                tabsRef.current.children,
                { opacity: 0, x: -30 },
                {
                  opacity: 1,
                  x: 0,
                  stagger: 0.08,
                  duration: 0.5,
                  ease: "power3.out",
                  clearProps: "transform",
                },
                "-=0.2"
              );
            }

            if (windowRef.current) {
              tl.fromTo(
                windowRef.current,
                { opacity: 0, y: 40, scale: 0.96 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.65,
                  ease: "power3.out",
                  clearProps: "transform",
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

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "justificativas") {
      setJustificativaStatus("pending");
    }

    // Smooth scroll to top/center of window mockup on mobile
    if (typeof window !== "undefined" && window.innerWidth < 1024 && windowRef.current) {
      const headerOffset = 85;
      const elementPosition = windowRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <section ref={sectionRef} id="plataforma-tour" className="py-20 lg:py-28 bg-black relative overflow-hidden border-t border-white/5">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-brand-green/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[450px] h-[450px] bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            ref={badgeRef}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 border border-brand-green/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-green mb-4 opacity-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Experiência Real da Plataforma
          </span>
          <h2
            ref={titleRef}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-dark leading-tight opacity-0"
          >
            Conheça o Viggo por dentro: <span className="text-brand-green">intuitivo, rápido e 100% em código</span>
          </h2>
          <p
            ref={paragraphRef}
            className="mt-4 text-base sm:text-lg text-on-dark-muted leading-relaxed opacity-0"
          >
            Veja como a sua empresa terá controle absoluto sobre jornadas, pontos e fechamentos fiscais sem planilhas ou burocracia.
          </p>
        </div>

        {/* Interactive Showcase Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Tab Selector List (Order 2 on Mobile, Order 1 on Desktop) */}
          <div ref={tabsRef} className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`text-left p-4 sm:p-5 rounded-2xl transition-all duration-300 relative border cursor-pointer opacity-0 ${
                    isActive
                      ? "bg-white/[0.06] border-brand-green/40 shadow-lg shadow-brand-green/5"
                      : "bg-white/[0.015] border-white/5 hover:bg-white/[0.03] hover:border-white/15"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-3 bottom-3 w-1 bg-brand-green rounded-r-full"
                    />
                  )}

                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                        isActive
                          ? "bg-brand-green text-black font-bold"
                          : "bg-white/5 text-on-dark-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-brand-green/20 text-brand-green border border-brand-green/30"
                              : "bg-white/5 text-on-dark-muted"
                          }`}
                        >
                          {tab.badge}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-on-dark truncate">
                        {tab.title}
                      </h3>
                      <p className="text-xs text-on-dark-muted line-clamp-2 mt-1 leading-relaxed">
                        {tab.shortDesc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Realistic App Window Mockup (Order 1 on Mobile, Order 2 on Desktop) */}
          <div ref={windowRef} className="order-1 lg:order-2 lg:col-span-8 opacity-0">
            <div className="rounded-3xl border border-white/15 bg-canvas-dark/95 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
              
              {/* Window Header / Browser Chrome */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-on-dark-muted">
                    <span className="text-brand-green">https://</span>
                    <span>painel.viggo.com.br/admin/{activeTab}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-on-dark-muted">
                  <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  <span className="font-semibold text-on-dark text-[11px]">Viggo Cloud v2.4</span>
                </div>
              </div>

              {/* Window Viewport / Screen Content */}
              <div className="p-5 sm:p-7 min-h-[460px] flex flex-col justify-center bg-gradient-to-b from-white/[0.02] to-transparent">
                <AnimatePresence mode="wait">
                  {activeTab === "dashboard" && (
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5"
                    >
                      {/* Top Welcome Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                        <div>
                          <div className="text-xs text-on-dark-muted font-medium">Empresa Homologada</div>
                          <div className="text-lg font-bold text-on-dark">TechViggo Soluções Digitais LTDA</div>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-brand-green/10 border border-brand-green/20 text-xs font-semibold text-brand-green">
                          <ShieldCheck className="w-4 h-4" />
                          Plano Enterprise Pro
                        </div>
                      </div>

                      {/* 4 Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                          <div className="text-xs text-on-dark-muted mb-1">Funcionários</div>
                          <div className="text-2xl font-extrabold text-on-dark">48</div>
                          <div className="text-[10px] text-emerald-400 mt-1 font-medium">100% Cadastrados</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                          <div className="text-xs text-on-dark-muted mb-1">Presentes Hoje</div>
                          <div className="text-2xl font-extrabold text-brand-green">42</div>
                          <div className="text-[10px] text-brand-green mt-1 font-medium">88% da equipe</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                          <div className="text-xs text-on-dark-muted mb-1">Justificativas</div>
                          <div className="text-2xl font-extrabold text-amber-400">2</div>
                          <div className="text-[10px] text-amber-400 mt-1 font-medium">Aguardando RH</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                          <div className="text-xs text-on-dark-muted mb-1">Auditados MTE</div>
                          <div className="text-2xl font-extrabold text-purple-400">168</div>
                          <div className="text-[10px] text-purple-400 mt-1 font-medium">Assinatura Digital</div>
                        </div>
                      </div>

                      {/* Usage and Today's Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-on-dark">Uso de Colaboradores</span>
                            <span className="text-xs font-bold text-brand-green">48 / 100</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full" style={{ width: "48%" }} />
                          </div>
                          <p className="text-[11px] text-on-dark-muted mt-2">
                            Seu plano comporta mais 52 colaboradores sem custo adicional.
                          </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-on-dark">Portaria 671 Homologada</div>
                            <div className="text-[11px] text-on-dark-muted mt-0.5">Certificado ICP-Brasil ativo</div>
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                            REP-P Válido
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "presentes" && (
                    <motion.div
                      key="presentes"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <h4 className="text-sm font-bold text-on-dark">Auditoria de Presenças em Tempo Real</h4>
                          <p className="text-xs text-on-dark-muted">Registros validados biometricamente com GPS</p>
                        </div>
                        <div className="text-xs text-on-dark-muted bg-white/5 px-3 py-1 rounded-xl border border-white/5">
                          Hoje, {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-green/30 transition-all text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold text-xs">
                              MF
                            </div>
                            <div>
                              <div className="font-semibold text-on-dark text-sm">Matheus Fragata</div>
                              <div className="text-[11px] text-on-dark-muted">Engenheiro de Software • Sede SP</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-mono font-bold text-on-dark">08:00:14</div>
                              <div className="text-[10px] text-emerald-400 font-medium">Entrada • Facial 99.8%</div>
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                              <MapPin className="w-3 h-3" /> Raio 12m
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-green/30 transition-all text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                              CS
                            </div>
                            <div>
                              <div className="font-semibold text-on-dark text-sm">Carolina Silva</div>
                              <div className="text-[11px] text-on-dark-muted">Designer UI/UX • Filial Sul</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-mono font-bold text-on-dark">08:02:40</div>
                              <div className="text-[10px] text-emerald-400 font-medium">Entrada • Facial 99.5%</div>
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                              <MapPin className="w-3 h-3" /> Raio 24m
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-green/30 transition-all text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                              RA
                            </div>
                            <div>
                              <div className="font-semibold text-on-dark text-sm">Rodrigo Alves</div>
                              <div className="text-[11px] text-on-dark-muted">Consultor Externo • Equipe Campo</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-mono font-bold text-on-dark">08:15:02</div>
                              <div className="text-[10px] text-emerald-400 font-medium">Entrada • Facial 99.9%</div>
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-full">
                              <MapPin className="w-3 h-3" /> Cliente ABC
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "folha" && (
                    <motion.div
                      key="folha"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5"
                    >
                      <div className="pb-3 border-b border-white/10">
                        <h4 className="text-sm font-bold text-on-dark">Exportação Oficial da Folha (Art. 78 §5º-A)</h4>
                        <p className="text-xs text-on-dark-muted">Geração de relatórios com hash SHA-256 e arquivos fiscais</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-on-dark">
                            <FileText className="w-4 h-4 text-brand-green" />
                            Relatório Mensal de Ponto (Espelho)
                          </div>
                          <p className="text-xs text-on-dark-muted leading-relaxed">
                            Exportação completa com total de horas normais, extras, adicionais noturnos e DSR.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button className="px-3 py-1.5 rounded-xl bg-brand-green text-black font-bold text-xs flex items-center gap-1.5 hover:bg-brand-green-deep transition-all">
                              <Download className="w-3.5 h-3.5" />
                              Exportar PDF
                            </button>
                            <button className="px-3 py-1.5 rounded-xl bg-white/10 text-on-dark font-medium text-xs flex items-center gap-1.5 hover:bg-white/20 transition-all">
                              CSV Oficial
                            </button>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-on-dark">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Arquivos Fiscais AFD & AEJ
                          </div>
                          <p className="text-xs text-on-dark-muted leading-relaxed">
                            Formato oficial do Ministério do Trabalho para fiscalização e integração contábil.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button className="px-3 py-1.5 rounded-xl bg-white/10 text-on-dark font-medium text-xs flex items-center gap-1.5 hover:bg-white/20 transition-all">
                              <Download className="w-3.5 h-3.5" />
                              Baixar Arquivo AFD
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-brand-green/5 border border-brand-green/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-brand-green" />
                          <span className="text-on-dark font-medium">Hash de Autenticidade Fiscal:</span>
                          <span className="font-mono text-[11px] text-on-dark-muted">e3b0c442...996fb924</span>
                        </div>
                        <span className="text-brand-green font-bold text-[11px]">100% Inviolável</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "justificativas" && (
                    <motion.div
                      key="justificativas"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <h4 className="text-sm font-bold text-on-dark">Central de Aprovação de Atestados & Faltas</h4>
                          <p className="text-xs text-on-dark-muted">Aprove documentos e abonos enviados pela equipe</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {justificativaStatus === "pending" ? "1 Solicitação Pendente" : "0 Pendentes"}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                              LM
                            </div>
                            <div>
                              <div className="font-semibold text-on-dark text-sm">Lucas Mendonça</div>
                              <div className="text-[11px] text-on-dark-muted">Analista Comercial • Atestado Médico (2 dias)</div>
                            </div>
                          </div>
                          <span className="text-[11px] text-on-dark-muted font-mono">CID: J06.9</span>
                        </div>

                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-on-dark-muted">
                          <span className="text-on-dark font-medium">Motivo:</span> Consulta médica de emergência e repouso prescrito.
                          <div className="mt-1 text-brand-green underline cursor-pointer text-[11px]">
                            📎 anexo_atestado_clinica_medica.pdf
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-on-dark-muted">
                            Status:{" "}
                            {justificativaStatus === "pending" && (
                              <span className="text-amber-400 font-semibold">Aguardando Avaliação</span>
                            )}
                            {justificativaStatus === "approved" && (
                              <span className="text-emerald-400 font-semibold">Aprovado pelo Gestor</span>
                            )}
                            {justificativaStatus === "rejected" && (
                              <span className="text-rose-400 font-semibold">Recusado</span>
                            )}
                          </div>

                          {justificativaStatus === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setJustificativaStatus("approved")}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-600 transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Aprovar Abono
                              </button>
                              <button
                                onClick={() => setJustificativaStatus("rejected")}
                                className="px-3.5 py-1.5 rounded-xl bg-white/10 text-rose-400 font-semibold text-xs flex items-center gap-1.5 hover:bg-white/20 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                Recusar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setJustificativaStatus("pending")}
                              className="text-xs text-brand-green hover:underline cursor-pointer"
                            >
                              Redefinir status
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "totem" && (
                    <motion.div
                      key="totem"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4 text-center py-2"
                    >
                      <div className="mx-auto p-6 rounded-3xl bg-black/60 border border-brand-green/30 relative overflow-hidden shadow-xl">
                        {/* Simulated Biometric Facial Frame */}
                        <div className="relative w-40 h-40 mx-auto mb-4 rounded-full border-2 border-brand-green flex items-center justify-center bg-brand-green/5">
                          <div className="absolute inset-2 rounded-full border border-dashed border-brand-green/40 animate-spin" style={{ animationDuration: "12s" }} />
                          <ScanFace className="w-16 h-16 text-brand-green animate-pulse" />
                          <span className="absolute -bottom-2 bg-brand-green text-black font-bold text-[10px] px-2 py-0.5 rounded-full">
                            MATCH 99.8%
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ponto Registrado com Sucesso!
                        </div>

                        <h4 className="text-base font-bold text-on-dark">Matheus Fragata</h4>
                        <p className="text-xs text-on-dark-muted font-mono mt-0.5">
                          Entrada: 08:00:15 • 22/08/2026
                        </p>

                        <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-on-dark-muted">
                          Totem Recepção 01 • Modo Contínuo Hands-Free
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Window Footer / Status Bar */}
              <div className="px-5 py-3 border-t border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-dark-muted">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                  <span>Sincronização Nuvem Ativa (Latência &lt; 50ms)</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span>Criptografia Ponta a Ponta</span>
                  <span>Portaria 671 MTE</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default AppShowcase;

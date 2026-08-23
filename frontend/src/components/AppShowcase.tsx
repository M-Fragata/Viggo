import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Users,
  ScanFace,
  Clock,
  UserPlus,
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
  Sparkles,
  LogIn,
  Utensils,
  Coffee,
  LogOut,
  Search,
  Calendar,
  ArrowRight,
  CreditCard,
  Link2,
  Lock,
  Printer,
} from "lucide-react";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";

interface TabItem {
  id: string;
  badge: string;
  title: string;
  shortDesc: string;
  route: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const TABS: TabItem[] = [
  {
    id: "dashboard",
    badge: "Visão Geral",
    title: "Painel & Métricas da Empresa",
    shortDesc: "Acompanhe presenças, ausências e limites do plano em tempo real.",
    route: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "funcionarios",
    badge: "Equipe",
    title: "Gestão de Colaboradores",
    shortDesc: "Controle perfis, escalas de trabalho e status facial de cada membro.",
    route: "/funcionarios",
    icon: Users,
  },
  {
    id: "ponto",
    badge: "App do Funcionário",
    title: "Bater Ponto com Biometria",
    shortDesc: "Registro facial com prova de vida e validação por geolocalização.",
    route: "/ponto",
    icon: ScanFace,
  },
  {
    id: "pontos",
    badge: "Histórico Individual",
    title: "Linha do Tempo de Marcações",
    shortDesc: "Auditoria de entradas, intervalos e horas trabalhadas no dia.",
    route: "/pontos",
    icon: Clock,
  },
  {
    id: "convites",
    badge: "Nova Admissão",
    title: "Convites & Cadastro de Equipe",
    shortDesc: "Admissão via QR Code, cadastro individual ou planilha em lote.",
    route: "/convites",
    icon: UserPlus,
  },
  {
    id: "folha",
    badge: "Portaria 671 MTE",
    title: "Fechamento de Folha & AFD",
    shortDesc: "Gere relatórios legais e arquivos fiscais com assinatura digital.",
    route: "/folha-mensal",
    icon: FileSpreadsheet,
  },
  {
    id: "justificativas",
    badge: "Gestão Ágil",
    title: "Atestados & Justificativas",
    shortDesc: "Aprove atestados médicos e ajustes com 1 clique direto pelo sistema.",
    route: "/justificativas",
    icon: ClipboardCheck,
  },
  {
    id: "totem",
    badge: "Quiosque Físico",
    title: "Modo Totem para Recepção",
    shortDesc: "Transforme qualquer tablet na entrada em ponto biométrico contínuo.",
    route: "/totem",
    icon: Tablet,
  },
];

export function AppShowcase() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isDark, setIsDark] = useState<boolean>(true);
  const [justificativaStatus, setJustificativaStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [admissionSubTab, setAdmissionSubTab] = useState<"link" | "manual" | "csv">("manual");
  const [manualName, setManualName] = useState<string>("Carlos Eduardo Mendes");

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
                  stagger: 0.06,
                  duration: 0.45,
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

  const activeTabItem = TABS.find((t) => t.id === activeTab) || TABS[0];

  // Dynamic provisional password for admission form
  const firstName = manualName.trim().split(" ")[0] || "colaborador";
  const autoGeneratedPassword = `${firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@viggo`;

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
            Conheça o Viggo por dentro: <span className="text-brand-green">intuitivo, ágil e em modo claro ou escuro</span>
          </h2>
          <p
            ref={paragraphRef}
            className="mt-4 text-base sm:text-lg text-on-dark-muted leading-relaxed opacity-0"
          >
            Navegue pelas telas reais do sistema. Veja como gestores e colaboradores interagem no dia a dia com biometria facial, controle de jornada e relatórios legais.
          </p>
        </div>

        {/* Interactive Showcase Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Tab Selector List (Order 2 on Mobile, Order 1 on Desktop) */}
          <div ref={tabsRef} className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-2.5 max-h-[640px] overflow-y-auto pr-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-300 relative border cursor-pointer opacity-0 ${
                    isActive
                      ? "bg-white/[0.07] border-brand-green/40 shadow-lg shadow-brand-green/5"
                      : "bg-white/[0.015] border-white/5 hover:bg-white/[0.03] hover:border-white/15"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-3 bottom-3 w-1 bg-brand-green rounded-r-full"
                    />
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isActive
                          ? "bg-brand-green text-black font-bold"
                          : "bg-white/5 text-on-dark-muted"
                      }`}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-brand-green/20 text-brand-green border border-brand-green/30"
                              : "bg-white/5 text-on-dark-muted"
                          }`}
                        >
                          {tab.badge}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-on-dark truncate">
                        {tab.title}
                      </h3>
                      <p className="text-[11px] text-on-dark-muted line-clamp-1 mt-0.5 leading-relaxed">
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
            <div className={`rounded-3xl border transition-colors duration-300 shadow-2xl overflow-hidden relative ${
              isDark 
                ? "bg-[#0b0c0e] border-white/15 text-slate-100" 
                : "bg-slate-100 border-slate-300 text-slate-900 shadow-slate-900/10"
            }`}>
              
              {/* Window Header / Browser Chrome */}
              <div className={`flex items-center justify-between px-5 py-3.5 border-b transition-colors ${
                isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200"
              }`}>
                {/* Traffic lights + Address Bar */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  
                  <div className={`hidden sm:flex items-center gap-1.5 ml-4 px-3 py-1 rounded-xl border text-[11px] font-mono transition-colors ${
                    isDark 
                      ? "bg-black/50 border-white/10 text-on-dark-muted" 
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}>
                    <span className="text-brand-green font-semibold">https://</span>
                    <span>viggo.fragata.me{activeTabItem.route}</span>
                  </div>
                </div>

                {/* Theme Toggle Button (Matching reference pill switch with light/dark adaptive colors) */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDark(!isDark)}
                    className={`relative inline-flex items-center w-[54px] h-[28px] rounded-full p-[3px] transition-colors cursor-pointer shadow-inner focus:outline-none select-none active:scale-95 border ${
                      isDark
                        ? "bg-[#1a1c27] border-[#2e3145] hover:border-[#424662]"
                        : "bg-slate-200 border-slate-300 hover:border-slate-400"
                    }`}
                    title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                    aria-label={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                  >
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shadow-md transition-colors ${
                        isDark
                          ? "ml-auto bg-[#363a50] text-white"
                          : "mr-auto bg-white text-amber-500 shadow-slate-400/30"
                      }`}
                    >
                      {isDark ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white">
                          <path
                            d="M13.5 3C8.8 3 5 6.8 5 11.5C5 16.2 8.8 20 13.5 20C16.8 20 19.7 18.1 21.1 15.3C15.8 15.6 11.4 11.2 11.7 5.9C12.3 4.6 13.3 3.6 13.5 3Z"
                            fill="currentColor"
                          />
                          <path d="M17.5 4.5L18.2 6.2L19.9 6.9L18.2 7.6L17.5 9.3L16.8 7.6L15.1 6.9L16.8 6.2L17.5 4.5Z" fill="currentColor" />
                          <path d="M20.5 9.5L21 10.7L22.2 11.2L21 11.7L20.5 12.9L20 11.7L18.8 11.2L20 10.7L20.5 9.5Z" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-500">
                          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
                          <path d="M12 2L13.5 5H10.5L12 2Z" fill="currentColor" />
                          <path d="M12 22L10.5 19H13.5L12 22Z" fill="currentColor" />
                          <path d="M2 12L5 10.5V13.5L2 12Z" fill="currentColor" />
                          <path d="M22 12L19 13.5V10.5L22 12Z" fill="currentColor" />
                          <path d="M4.93 4.93L7.76 6.85L5.85 8.76L4.93 4.93Z" fill="currentColor" />
                          <path d="M19.07 19.07L16.24 17.15L18.15 15.24L19.07 19.07Z" fill="currentColor" />
                          <path d="M4.93 19.07L6.85 16.24L8.76 18.15L4.93 19.07Z" fill="currentColor" />
                          <path d="M19.07 4.93L17.15 7.76L15.24 5.85L19.07 4.93Z" fill="currentColor" />
                        </svg>
                      )}
                    </motion.div>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold hidden md:inline uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Ao Vivo
                    </span>
                  </div>
                </div>
              </div>

              {/* Window Viewport / Screen Content */}
              <div className={`p-4 sm:p-6 min-h-[500px] flex flex-col justify-start transition-colors duration-200 ${
                isDark ? "bg-[#0b0c0e]" : "bg-slate-50"
              }`}>
                <AnimatePresence mode="wait">

                  {/* 1. ABA DASHBOARD (VISÃO GERAL) */}
                  {activeTab === "dashboard" && (
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Top Header Card */}
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-colors ${
                        isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                      }`}>
                        <div>
                          <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Empresa Ativa
                          </div>
                          <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                            TechViggo Soluções Digitais LTDA
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 w-fit">
                          <ShieldCheck className="w-4 h-4" />
                          Plano Enterprise Pro
                        </div>
                      </div>

                      {/* 4 Metric Cards (Matching DashboardPage.tsx MetricCard) */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className={`p-4 rounded-3xl border shadow-xs transition-all ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Users size={18} />
                            </div>
                            <ArrowRight size={14} className={isDark ? "text-slate-600" : "text-slate-300"} />
                          </div>
                          <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>48</p>
                          <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Funcionários</p>
                        </div>

                        <div className={`p-4 rounded-3xl border shadow-xs transition-all ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={18} />
                            </div>
                            <ArrowRight size={14} className={isDark ? "text-slate-600" : "text-slate-300"} />
                          </div>
                          <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>42</p>
                          <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Presentes hoje</p>
                          <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">88% da equipe</p>
                        </div>

                        <div className={`p-4 rounded-3xl border shadow-xs transition-all ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <ClipboardCheck size={18} />
                            </div>
                            <ArrowRight size={14} className={isDark ? "text-slate-600" : "text-slate-300"} />
                          </div>
                          <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>2</p>
                          <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Justificativas</p>
                          <p className="text-[10px] text-amber-500 font-semibold mt-0.5">Aguardando RH</p>
                        </div>

                        <div className={`p-4 rounded-3xl border shadow-xs transition-all ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <UserPlus size={18} />
                            </div>
                            <ArrowRight size={14} className={isDark ? "text-slate-600" : "text-slate-300"} />
                          </div>
                          <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>5</p>
                          <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Convites ativos</p>
                        </div>
                      </div>

                      {/* Plano + Acesso Rápido */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className={`p-5 rounded-3xl border shadow-xs ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Uso do Plano</h3>
                              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Plano Pro • 48 de 100 membros</p>
                            </div>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isDark ? "bg-white/5 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                            }`}>
                              <CreditCard size={18} />
                            </div>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-100"}`}>
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "48%" }} />
                          </div>
                          <div className="flex justify-between items-center mt-3 text-xs">
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>52 vagas disponíveis</span>
                            <span className="text-emerald-500 font-bold">48% utilizado</span>
                          </div>
                        </div>

                        <div className={`p-5 rounded-3xl border shadow-xs ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <h3 className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-slate-800"}`}>Acesso Rápido</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-colors ${
                              isDark ? "bg-white/[0.02] border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}>
                              <FileText size={14} className="text-emerald-500" />
                              <span>Folha Mensal</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-colors ${
                              isDark ? "bg-white/[0.02] border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}>
                              <Clock size={14} className="text-emerald-500" />
                              <span>Escalas</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-colors ${
                              isDark ? "bg-white/[0.02] border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}>
                              <UserPlus size={14} className="text-emerald-500" />
                              <span>Convites</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-colors ${
                              isDark ? "bg-white/[0.02] border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}>
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span>Presentes</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 2. ABA COLABORADORES (FUNCIONARIOS) */}
                  {activeTab === "funcionarios" && (
                    <motion.div
                      key="funcionarios"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Header + Search Bar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                            Gestão de Colaboradores
                          </h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Gerencie escalas, perfis de acesso e status facial
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs">
                          <UserPlus size={14} />
                          Convidar Colaborador
                        </div>
                      </div>

                      {/* Stat Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className={`p-3 rounded-2xl border ${isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"}`}>
                          <div className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total</div>
                          <div className={`text-lg font-extrabold ${isDark ? "text-white" : "text-slate-800"}`}>48</div>
                        </div>
                        <div className={`p-3 rounded-2xl border ${isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"}`}>
                          <div className={`text-[10px] font-semibold text-emerald-500`}>Face Ativa</div>
                          <div className="text-lg font-extrabold text-emerald-500">46</div>
                        </div>
                        <div className={`p-3 rounded-2xl border ${isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"}`}>
                          <div className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Admins</div>
                          <div className={`text-lg font-extrabold ${isDark ? "text-white" : "text-slate-800"}`}>3</div>
                        </div>
                        <div className={`p-3 rounded-2xl border ${isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"}`}>
                          <div className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Com Escala</div>
                          <div className={`text-lg font-extrabold ${isDark ? "text-white" : "text-slate-800"}`}>48</div>
                        </div>
                      </div>

                      {/* Employee Table Mockup */}
                      <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"}`}>
                        <div className={`p-3 border-b flex items-center justify-between gap-3 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                          <div className="flex items-center gap-2 flex-1">
                            <Search size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Buscar por nome ou e-mail...</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Todos (48)</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Funcionários</span>
                          </div>
                        </div>

                        <div className="divide-y divide-white/5">
                          {[
                            { initials: "MF", name: "Matheus Fragata", email: "matheus.fragata@techviggo.com", role: "ADMIN", schedule: "Comercial 44h", face: true },
                            { initials: "CS", name: "Carolina Silva", email: "carolina.silva@techviggo.com", role: "FUNCIONÁRIO", schedule: "Flexível 40h", face: true },
                            { initials: "RA", name: "Rodrigo Alves", email: "rodrigo.alves@techviggo.com", role: "FUNCIONÁRIO", schedule: "Escala 12x36", face: true },
                            { initials: "LM", name: "Lucas Mendonça", email: "lucas.mendonca@techviggo.com", role: "FUNCIONÁRIO", schedule: "Comercial 44h", face: false },
                          ].map((emp, i) => (
                            <div key={i} className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                              isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold">
                                  {emp.initials}
                                </div>
                                <div>
                                  <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`}>{emp.name}</div>
                                  <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{emp.email}</div>
                                </div>
                              </div>

                              <div className="hidden sm:flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                                  isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {emp.schedule}
                                </span>
                                {emp.face ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-semibold flex items-center gap-1">
                                    <Check size={10} /> Face OK
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-semibold">
                                    Pendente
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 3. ABA BATER PONTO (/ponto) */}
                  {activeTab === "ponto" && (
                    <motion.div
                      key="ponto"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                            Bater Ponto Biométrico
                          </h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Reconhecimento facial com prova de vida e GPS
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                          08:00:15
                        </span>
                      </div>

                      {/* 4 Action Buttons Grid (Matching PontoPage.tsx) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                        }`}>
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <LogIn size={24} />
                          </div>
                          <div>
                            <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Entrada</h4>
                            <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Registrado às 08:00</p>
                          </div>
                          <button className="w-full py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed">
                            Ponto Registrado
                          </button>
                        </div>

                        <div className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                        }`}>
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <Utensils size={24} />
                          </div>
                          <div>
                            <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Início Almoço</h4>
                            <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Requer facial</p>
                          </div>
                          <button className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm">
                            Registrar Ponto
                          </button>
                        </div>

                        <div className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 opacity-60 ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-400">
                            <Coffee size={24} />
                          </div>
                          <div>
                            <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Retorno Almoço</h4>
                            <p className="text-[10px] text-slate-400">Aguardando início</p>
                          </div>
                          <button disabled className="w-full py-1.5 rounded-xl bg-slate-200 dark:bg-white/5 text-[10px] font-bold text-slate-400 cursor-not-allowed">
                            Aguardando
                          </button>
                        </div>

                        <div className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 opacity-60 ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                            <LogOut size={24} />
                          </div>
                          <div>
                            <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Saída</h4>
                            <p className="text-[10px] text-slate-400">Fim da jornada</p>
                          </div>
                          <button disabled className="w-full py-1.5 rounded-xl bg-slate-200 dark:bg-white/5 text-[10px] font-bold text-slate-400 cursor-not-allowed">
                            Aguardando
                          </button>
                        </div>
                      </div>

                      {/* GPS Card */}
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                        isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                      }`}>
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-emerald-500" />
                          <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                            Localização Validada: <strong className={isDark ? "text-white" : "text-slate-900"}>Sede SP (Raio 12m)</strong>
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          Cerca Virtual OK
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* 4. ABA MEUS PONTOS (/pontos) */}
                  {activeTab === "pontos" && (
                    <motion.div
                      key="pontos"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                            Histórico de Pontos do Dia
                          </h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Timeline de marcações e comprovantes digitais
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                          isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                        }`}>
                          <Calendar size={14} className="text-emerald-500" />
                          <span>Hoje, 23 Ago 2026</span>
                        </div>
                      </div>

                      {/* Main Timeline Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`md:col-span-2 p-4 rounded-3xl border ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                        }`}>
                          <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}>
                            <Clock size={14} className="text-emerald-500" />
                            Linha do Tempo
                          </h4>

                          <div className={`relative border-l-2 ml-3 pl-6 space-y-4 ${
                            isDark ? "border-white/10" : "border-slate-200"
                          }`}>
                            {[
                              { time: "08:00", label: "Entrada", match: "Facial 99.8%", gps: "-23.5505, -46.6333" },
                              { time: "12:02", label: "Saída Almoço", match: "Facial 99.5%", gps: "-23.5505, -46.6333" },
                              { time: "13:00", label: "Retorno Almoço", match: "Facial 99.9%", gps: "-23.5505, -46.6333" },
                              { time: "18:03", label: "Saída Final", match: "Facial 99.7%", gps: "-23.5505, -46.6333" },
                            ].map((p, idx) => (
                              <div key={idx} className="relative">
                                <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-emerald-500 ${
                                  isDark ? "bg-[#111113]" : "bg-white"
                                }`} />
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <span className={`font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{p.time}</span>
                                    <span className="ml-2 text-emerald-500 font-semibold uppercase text-[11px]">{p.label}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{p.match}</span>
                                    <span className="text-[10px] text-emerald-500 font-mono hidden sm:inline">GPS OK</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Hours Summary Card */}
                        <div className={`p-4 rounded-3xl border flex flex-col justify-between ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                        }`}>
                          <div>
                            <div className={`text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Trabalhado</div>
                            <div className="text-3xl font-extrabold text-emerald-500 mt-1">08:01h</div>
                            <p className={`text-[11px] mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              Jornada padrão de 08:00h cumprida com sucesso.
                            </p>
                          </div>

                          <button className="w-full mt-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer">
                            <Printer size={14} />
                            Comprovante Oficial
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 5. ABA ADMISSÃO (/convites) */}
                  {activeTab === "convites" && (
                    <motion.div
                      key="convites"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                            Admissão de Colaboradores
                          </h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Links de convite, cadastro manual ou importação CSV
                          </p>
                        </div>
                      </div>

                      {/* 3 Sub-Tabs (Matching ConvitesPage.tsx) */}
                      <div className={`p-1 rounded-2xl border flex gap-1 ${
                        isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                      }`}>
                        <button
                          onClick={() => setAdmissionSubTab("link")}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            admissionSubTab === "link"
                              ? "bg-emerald-600 text-white"
                              : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Link2 size={13} />
                          <span>Links QR</span>
                        </button>
                        <button
                          onClick={() => setAdmissionSubTab("manual")}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            admissionSubTab === "manual"
                              ? "bg-emerald-600 text-white"
                              : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <UserPlus size={13} />
                          <span>Cadastro Manual</span>
                        </button>
                        <button
                          onClick={() => setAdmissionSubTab("csv")}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            admissionSubTab === "csv"
                              ? "bg-emerald-600 text-white"
                              : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <FileSpreadsheet size={13} />
                          <span>Importar CSV</span>
                        </button>
                      </div>

                      {/* Manual Form Preview */}
                      <div className={`p-4 sm:p-5 rounded-3xl border space-y-3 ${
                        isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                      }`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className={`block font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              Nome Completo
                            </label>
                            <input
                              type="text"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-emerald-500 font-medium ${
                                isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              E-mail Corporativo
                            </label>
                            <input
                              type="text"
                              readOnly
                              value="carlos.mendes@techviggo.com"
                              className={`w-full px-3 py-2 rounded-xl border font-medium ${
                                isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Generated Password Box (Feature recently implemented) */}
                        <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          isDark ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        }`}>
                          <div className="flex items-center gap-2">
                            <Lock size={16} className="text-emerald-500" />
                            <div>
                              <div className="text-[11px] font-bold">Senha Provisória Gerada:</div>
                              <div className="font-mono text-xs font-bold text-emerald-500">{autoGeneratedPassword}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full text-emerald-500 border border-emerald-500/20">
                            Troca Obrigatória no 1º Login
                          </span>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
                            <UserPlus size={14} />
                            Cadastrar e Liberar Acesso
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 6. ABA FOLHA MENSAL (/folha-mensal) */}
                  {activeTab === "folha" && (
                    <motion.div
                      key="folha"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                            Folha Mensal & Espelho MTE
                          </h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Conformidade integral Portaria 671 MTE (Art. 78 §5º-A)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                            REP-P Válido
                          </span>
                        </div>
                      </div>

                      {/* Export Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={`p-4 rounded-3xl border space-y-2.5 ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                        }`}>
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <FileText size={16} className="text-emerald-500" />
                            <span className={isDark ? "text-white" : "text-slate-800"}>Espelho de Ponto Oficial (PDF)</span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Relatório individual com cálculo de horas normais, extras, DSR e adicionais.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                              <Download size={13} />
                              Exportar PDF
                            </button>
                            <button className={`px-3 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}>
                              CSV Consolidado
                            </button>
                          </div>
                        </div>

                        <div className={`p-4 rounded-3xl border space-y-2.5 ${
                          isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                        }`}>
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            <span className={isDark ? "text-white" : "text-slate-800"}>Arquivos Fiscais AFD & AEJ</span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Layout fiscal inviolável para auditoria do Ministério do Trabalho e contabilidade.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button className={`px-3 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}>
                              <Download size={13} />
                              Baixar AFD
                            </button>
                            <button className={`px-3 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}>
                              Baixar AEJ
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Hash Box */}
                      <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                        isDark ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                      }`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          <span className={isDark ? "text-slate-300" : "text-slate-700"}>Hash SHA-256:</span>
                          <span className="font-mono text-[11px] text-emerald-500 font-bold">e3b0c442...996fb924</span>
                        </div>
                        <span className="text-emerald-500 font-bold text-[11px]">100% Inviolável</span>
                      </div>
                    </motion.div>
                  )}

                  {/* 7. ABA JUSTIFICATIVAS (/justificativas) */}
                  {activeTab === "justificativas" && (
                    <motion.div
                      key="justificativas"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                            Aprovação de Atestados & Justificativas
                          </h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Gerencie abonos e documentos enviados pela equipe
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {justificativaStatus === "pending" ? "1 Solicitação Pendente" : "0 Pendentes"}
                        </span>
                      </div>

                      {/* Interactive Request Card */}
                      <div className={`p-4 rounded-3xl border space-y-3 ${
                        isDark ? "bg-[#111113] border-white/10" : "bg-white border-slate-200 shadow-xs"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
                              LM
                            </div>
                            <div>
                              <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Lucas Mendonça</div>
                              <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Analista Comercial • Atestado Médico (2 dias)
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">CID: J06.9</span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                          isDark ? "bg-white/[0.02] border-white/5 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}>
                          <strong>Motivo:</strong> Consulta médica de urgência e repouso médico recomendado.
                          <div className="mt-1.5 text-emerald-500 underline font-semibold text-[11px] cursor-pointer flex items-center gap-1">
                            📎 atestado_medico_consulta_clinica.pdf
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs font-medium">
                            Status:{" "}
                            {justificativaStatus === "pending" && (
                              <span className="text-amber-500 font-bold">Aguardando Avaliação</span>
                            )}
                            {justificativaStatus === "approved" && (
                              <span className="text-emerald-500 font-bold">✓ Aprovado pelo Gestor</span>
                            )}
                            {justificativaStatus === "rejected" && (
                              <span className="text-rose-500 font-bold">✕ Recusado</span>
                            )}
                          </div>

                          {justificativaStatus === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setJustificativaStatus("approved")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              >
                                <Check size={13} />
                                Aprovar Abono
                              </button>
                              <button
                                onClick={() => setJustificativaStatus("rejected")}
                                className={`px-3 py-1.5 rounded-xl border text-rose-500 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  isDark ? "border-rose-500/30 hover:bg-rose-500/10" : "border-rose-200 bg-rose-50 hover:bg-rose-100"
                                }`}
                              >
                                <X size={13} />
                                Recusar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setJustificativaStatus("pending")}
                              className="text-xs text-emerald-500 font-bold hover:underline cursor-pointer"
                            >
                              Redefinir status
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 8. ABA MODO TOTEM (/totem) */}
                  {activeTab === "totem" && (
                    <motion.div
                      key="totem"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4 text-center py-2"
                    >
                      <div className={`mx-auto p-6 rounded-3xl border relative overflow-hidden shadow-xl ${
                        isDark ? "bg-black/60 border-emerald-500/30" : "bg-white border-emerald-500/40 shadow-emerald-500/5"
                      }`}>
                        {/* Simulated Biometric Facial Frame */}
                        <div className="relative w-36 h-36 mx-auto mb-4 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-emerald-500/5">
                          <div className="absolute inset-2 rounded-full border border-dashed border-emerald-500/40 animate-spin" style={{ animationDuration: "10s" }} />
                          <ScanFace className="w-14 h-14 text-emerald-500 animate-pulse" />
                          <span className="absolute -bottom-2 bg-emerald-500 text-black font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                            MATCH 99.8%
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full mb-2">
                          <CheckCircle2 size={14} />
                          Ponto Registrado com Sucesso!
                        </div>

                        <h4 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          Matheus Fragata
                        </h4>
                        <p className={`text-xs font-mono mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Entrada: 08:00:15 • 23/08/2026
                        </p>

                        <div className={`mt-4 pt-3 border-t text-[11px] ${
                          isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
                        }`}>
                          Totem Recepção 01 • Modo Contínuo Hands-Free Ativo
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Window Footer / Status Bar */}
              <div className={`px-5 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs transition-colors ${
                isDark ? "bg-white/[0.01] border-white/10 text-slate-400" : "bg-white border-slate-200 text-slate-600"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">© 2026 Viggo Tecnologia. Todos os direitos reservados.</span>
                </div>
                <div className="sm:hidden text-[11px] font-semibold">
                  <span>Conforme Portaria 671/2021 MTE & LGPD</span>
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

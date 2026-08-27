import { useState, useEffect } from "react";
import { Link } from "react-router";
import { PricingSection } from "../components/PricingSection";
import { CTASection } from "../components/CTASection";
import GradientWaves from "../components/GradientWaves";
import SpecularButton from "../components/SpecularButton";
import { HeroContent } from "../components/HeroContent";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Preloader } from "../components/Preloader";
import { Marquee } from "../components/Marquee";
import { BentoGrid } from "../components/BentoGrid";
import { HowItWorks } from "../components/HowItWorks";
import { TargetAudience } from "../components/TargetAudience";
import { ManagerShowcase } from "../components/ManagerShowcase";
import { AppShowcase } from "../components/AppShowcase";
import { FAQ } from "../components/FAQ";
import { FloatingWhatsApp } from "../components/FloatingWhatsApp";
import { useTheme } from "../contexts/ThemeContext";
import { trackPageView, trackEvent } from "../utils/metrics";

import logo from "../assets/logo.png";
import "../scroll-animations.css";

export function LandingPage() {
  useScrollReveal();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [showPreloader, setShowPreloader] = useState(true);
  const [startHeroAnimation, setStartHeroAnimation] = useState(false);

  useEffect(() => {
    trackPageView("/page");
  }, []);

  const handlePreloaderComplete = () => {
    setShowPreloader(false);
    setStartHeroAnimation(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-on-dark selection:bg-brand-green selection:text-black transition-colors duration-200">
      {showPreloader && <Preloader onComplete={handlePreloaderComplete} />}

      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/70 border-b border-slate-200/80 dark:border-white/5 transition-all">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Navegação Principal">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/page" className="flex items-center gap-2">
                <img src={logo} alt="Viggo Logo" className="w-24 md:w-28 h-auto drop-shadow-xl rounded-xl" />
              </Link>

              <div className="hidden lg:flex items-center gap-7 text-sm text-slate-600 dark:text-on-dark-muted font-medium">
                <a href="#funcionalidades" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">
                  Funcionalidades
                </a>
                <a href="#como-funciona" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">
                  Como Funciona
                </a>
                <a href="#para-quem-e" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">
                  Segmentos
                </a>
                <a href="#plataforma-tour" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">
                  Tour do Sistema
                </a>
                <a href="#precos" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">
                  Planos
                </a>
                <a href="#faq" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">
                  Dúvidas Frequentes
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/"
                state={{ fromLanding: true }}
                className="text-sm font-semibold text-slate-800 dark:text-on-dark hover:text-brand-green dark:hover:text-brand-green transition-colors px-3 py-2"
              >
                Entrar
              </Link>
              <Link to="/company/signup" onClick={() => trackEvent("cta_click", { ctaId: "header-criar-conta", path: "/page" })}>
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
                  className="font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-green/15 cursor-pointer"
                >
                  Criar conta grátis
                </SpecularButton>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <GradientWaves
              horizonColor={isDark ? "#00D4A4" : "#009B77"}
              waveColor={isDark ? "#00D4A4" : "#008F6D"}
              crestColor={isDark ? "#00664e" : "#004D38"}
              speed={0.4}
              amplitude={2.5}
              waveScale={0.6}
              waveRatio={0.9}
              swell={35}
              turbulence={20}
              tilt={1.11}
              zoom={1}
              height={10}
              fogDepth={15}
              detail="medium"
              brightness={isDark ? 1.35 : 1.0}
              opacity={1}
              mouseInteraction={false}
              parallaxStrength={0.4}
              grain={true}
              grainIntensity={0.05}
              className="absolute inset-0"
            />
          </div>
          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10 py-16 lg:py-24 flex items-center justify-center">
            <HeroContent startAnimation={startHeroAnimation} />
          </div>
        </section>

        {/* Social Proof & Integrations Banner */}
        <Marquee />

        {/* Bento Grid: Core B2B Features */}
        <BentoGrid />

        {/* How It Works: 3 Simple Steps */}
        <HowItWorks />

        {/* Target Audience / Industry Segments */}
        <TargetAudience />

        {/* Manager Showcase & ROI */}
        <div id="painel-gestor">
          <ManagerShowcase />
        </div>

        {/* Interactive App & Admin Showcase (Coded Mockup) */}
        <AppShowcase />

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ Section */}
        <FAQ />

        {/* Final CTA Section */}
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-canvas-dark text-slate-600 dark:text-on-dark-muted transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1 space-y-4">
              <img src={logo} alt="Viggo Logo" className="w-24 h-auto drop-shadow-md rounded-xl" />
              <p className="text-xs text-slate-500 dark:text-on-dark-muted leading-relaxed">
                Plataforma inteligente de ponto eletrônico com reconhecimento facial, geolocalização e 100% de conformidade com a Portaria 671 do MTE.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-on-dark mb-4 uppercase tracking-wider">Produto</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#funcionalidades" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Funcionalidades</a></li>
                <li><a href="#como-funciona" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Como Funciona</a></li>
                <li><a href="#para-quem-e" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Segmentos Atendidos</a></li>
                <li><a href="#plataforma-tour" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Tour do Sistema</a></li>
                <li><a href="#precos" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Tabela de Preços</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-on-dark mb-4 uppercase tracking-wider">Jurídico & LGPD</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link to="/termos-de-uso" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Termos de Uso</Link></li>
                <li><Link to="/politica-privacidade" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/contrato-de-tratamento-de-dados" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Contrato de Tratamento de Dados (DPA)</Link></li>
                <li><Link to="/consentimento-biometria" className="hover:text-brand-green dark:hover:text-brand-green transition-colors">Consentimento Biométrico</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-on-dark mb-4 uppercase tracking-wider">Começar Agora</h4>
              <p className="text-xs text-slate-500 dark:text-on-dark-muted mb-4">
                Teste grátis por 30 dias com todos os recursos liberados.
              </p>
              <Link
                to="/company/signup"
                onClick={() => trackEvent("cta_click", { ctaId: "footer-cadastrar-empresa", path: "/page" })}
                className="inline-block w-full text-center py-2.5 px-4 rounded-xl bg-slate-900/5 dark:bg-white/10 hover:bg-brand-green dark:hover:bg-brand-green hover:text-black dark:hover:text-black text-slate-900 dark:text-on-dark text-xs font-semibold transition-all border border-slate-200 dark:border-white/10"
              >
                Cadastrar Empresa
              </Link>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-on-dark-muted">
            <p>© {new Date().getFullYear()} Viggo Tecnologia. Todos os direitos reservados.</p>
            <p>Em conformidade com a Portaria 671/2021 MTE e LGPD.</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Widget */}
      <FloatingWhatsApp />
    </div>
  );
}

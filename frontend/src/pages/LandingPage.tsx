import { Link } from "react-router";
import { TypewriterText } from "../components/TypewriterText";
import { PricingSection } from "../components/PricingSection";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { TRIAL_DAYS } from "../../../shared/plans";

import logo from "../assets/logo.png";
import "../scroll-animations.css";

const HERO_WORDS = [
  "reconhecimento facial",
  "geolocalização",
  "anti-fraude",
  "conformidade CLT",
];

const USER_FEATURES = [
  { title: "Verificação facial ao vivo", desc: "Biometria facial garante que só você registra seu ponto." },
  { title: "Registro geográfico", desc: "GPS registra sua localização exata no momento da marcação." },
  { title: "Comprovante instantâneo", desc: "Receba comprovante de cada ponto batido em tempo real." },
  { title: "Histórico completo", desc: "Acesse todos os seus registros a qualquer momento." },
  { title: "Sem hardware", desc: "Use seu próprio celular. Zero custo com equipamentos." },
];

const COMPANY_FEATURES = [
  { title: "Dashboard completo", desc: "Visão geral de colaboradores, pontos, pendências e métricas em tempo real." },
  { title: "Verificação real dos pontos", desc: "Foto, localização e horário exato de cada marcação registrada." },
  { title: "Criação de funcionários e convites", desc: "Cadastre colaboradores e envie convite para criação de conta." },
  { title: "Folha de ponto mensal", desc: "Gere automaticamente a folha individual por funcionário." },
  { title: "Conformidade CLT", desc: "Processos dentro das exigências legais, sem dor de cabeça." },
];

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-brand-green"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function LandingPage() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline">
        <nav className="mx-auto max-w-7xl px-8" aria-label="Global">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <img src={logo} alt="Viggo Logo" className="w-25 md:w-32 h-auto drop-shadow-xl rounded-2xl" />
            </div>
            <div className="hidden md:flex md:items-center md:gap-8">
              <Link
                to="/company/signup"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative py-24 lg:py-30 bg-gradient-to-br from-hero-dark-from via-hero-dark-from to-hero-dark-to overflow-hidden">
          <div className="mx-auto max-w-7xl px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="hidden lg:flex justify-center lg:w-2/5">
                <picture className="parallax-slow">
                  <img
                    src="/viggo front.png"
                    alt="Viggo - Controle de ponto com reconhecimento facial"
                    className="h-auto max-w-[360px] w-full object-cover rounded-lg border border-hairline-dark shadow-[0_24px_48px_-8px_rgba(0,0,0,0.12)] reveal-scale"
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              </div>
              <div className="text-center lg:text-left lg:w-3/5 max-w-2xl flex flex-col justify-center gap-5 reveal">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-on-dark leading-[1.1]">
                  Controle de ponto com{" "}<br />
                  <span className="text-brand-green">
                    <TypewriterText
                      words={HERO_WORDS}
                      className="text-brand-green"
                      typeSpeed={80}
                      deleteSpeed={40}
                      pauseDuration={2000}
                      cursorClassName="text-brand-green-deep"
                    />
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-on-dark-muted ">
                  Elimine fraudes, ganhe agilidade e tenha total conformidade legal.
                  Setup em minutos, sem hardware extra.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link
                    to="/company/signup"
                    className="rounded-full bg-brand-green px-8 py-3.5 text-sm font-medium text-primary hover:bg-brand-green-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-colors"
                  >
                    Começar trial de {TRIAL_DAYS} dias
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-full border border-slate bg-white/10 px-8 py-3.5 text-sm font-medium text-on-dark hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark transition-colors"
                  >
                    Já tenho conta
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:hidden mt-12 mb-12 w-[300px] mx-auto">
              <picture>
                <img
                  src="/viggo front.png"
                  alt="Viggo - Controle de ponto com reconhecimento facial"
                  className="w-full h-auto object-cover rounded-lg border border-hairline-dark shadow-[0_24px_48px_-8px_rgba(0,0,0,0.12)]"
                  loading="eager"
                  fetchPriority="high"
                />
              </picture>
            </div>
          </div>
        </section>

        <section className="bg-surface py-24">
          <div className="mx-auto max-w-7xl px-8">
            <div className="text-center mb-16 reveal">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink leading-[1.2]">
                Feito para você e para sua empresa
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-steel max-w-2xl mx-auto">
                Tudo que você precisa para registrar, controlar e gerenciar jornadas de trabalho — em um só lugar.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="w-full lg:w-2/5 reveal-left">
                <img
                  src="/celular na mao.webp"
                  alt="Viggo no celular - Registro de ponto com verificação facial"
                  className="w-full h-auto rounded-lg border border-hairline-dark shadow-[0_4px_12px_rgba(0,0,0,0.08)] object-cover"
                  loading="lazy"
                />
              </div>
              <div className="w-full lg:w-3/5 reveal-right">
                <span className="inline-block rounded-full bg-brand-green/15 px-3 py-1 text-sm font-medium text-brand-green">
                  Para você
                </span>
                <h3 className="mt-4 text-xl font-semibold text-ink leading-[1.3]">
                  Seu ponto com segurança e praticidade
                </h3>
                <ul className="mt-6 space-y-4 reveal-stagger">
                  {USER_FEATURES.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon />
                      <div className="text-base leading-relaxed">
                        <span className="font-medium text-ink">{feature.title}</span>
                        <span className="text-steel"> — {feature.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1a3d4a] py-24">
          <div className="mx-auto max-w-7xl px-8">
            <div className="mt-24 flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16">
              <div className="w-full lg:w-3/5 reveal-left">
                <span className="inline-block rounded-full bg-primary/5 px-3 py-1 text-sm font-medium text-slate">
                  Para sua empresa
                </span>
                <h3 className="mt-4 text-xl font-semibold text-on-dark leading-[1.3]">
                  Controle total da jornada de trabalho
                </h3>
                <ul className="mt-6 space-y-4 reveal-stagger">
                  {COMPANY_FEATURES.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon />
                      <div className="text-base leading-relaxed">
                        <span className="font-medium text-on-dark">{feature.title}</span>
                        <span className="text-on-dark-muted"> — {feature.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full lg:w-2/5 reveal-right">
                <img
                  src="/viggo front.png"
                  alt="Viggo - Painel administrativo para gestão de ponto"
                  className="w-full h-auto rounded-lg border border-hairline-dark shadow-[0_4px_12px_rgba(0,0,0,0.08)] object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="py-24 bg-canvas-dark">
          <div className="mx-auto max-w-7xl px-8 text-center reveal">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-on-dark leading-[1.2]">
              Pronto para modernizar seu controle de ponto?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-on-dark-muted max-w-2xl mx-auto">
              Crie sua conta em minutos. Trial gratuito de {TRIAL_DAYS} dias, sem cartão de crédito.
            </p>
            <div className="mt-10">
              <Link
                to="/company/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand-green px-8 py-3.5 text-sm font-medium text-primary hover:bg-brand-green-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-colors"
              >
                Criar minha empresa grátis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto max-w-7xl px-8 py-16">
          <div className="flex flex-col items-center gap-6">
            <span className="text-xl font-semibold text-ink">Viggo</span>
            <p className="text-sm text-steel">
              © 2026 Viggo. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link } from "react-router";
import TextType from "../components/TextType";
import { PricingSection } from "../components/PricingSection";
import GradientWaves from "../components/GradientWaves";
import SpecularButton from "../components/SpecularButton";
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
  { title: "Cara, ponto.", desc: "Câmera frontal confirma que é você. Sem chance de terceiros baterem seu ponto." },
  { title: "GPS no momento certo", desc: "Localização capturada só na hora da marcação. Sem rastreamento em background." },
  { title: "Comprovante na hora", desc: "Cada ponto gera um recibo. Você vê, baixa, guarda." },
  { title: "Linha do tempo", desc: "Todos os seus registros num histórico limpo. Filtra por data, exporta quando quiser." },
  { title: "Celular é suficiente", desc: "Sem terminais, sem biometria dedicada. Seu android ou iPhone resolve." },
];

const COMPANY_FEATURES = [
  { title: "Painel em tempo real", desc: "Veja quem bateu ponto, quem faltou, quem está atrasado — tudo atualizado ao vivo." },
  { title: "Prova de cada ponto", desc: "Foto + GPS + horário. Ninguém contesta um registro desses." },
  { title: "Convites em segundos", desc: "Cadastra o funcionário, ele recebe o link e cria a conta sozinho." },
  { title: "Folha pronta", desc: "Fechamento mensal automático por funcionário. Sem planilha, sem erro." },
  { title: "100% CLT", desc: "Regras de jornada, intervalos e banco de horas configurados. Você não advinha a lei, o sistema aplica." },
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
    <div className="min-h-screen bg-black">
      <header className="pt-1">
        <nav className="mx-auto max-w-7xl px-8" aria-label="Global">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <img src={logo} alt="Viggo Logo" className="w-25 md:w-32 h-auto drop-shadow-xl rounded-2xl" />
            </div>
            <div className="md:flex md:items-center md:gap-8">
              <Link to="/company/signup">
                <SpecularButton
                  size="md"
                  radius={24}
                  textColor="#ffffff"
                  lineColor="#009966"
                  baseColor="#ffffff"
                  intensity={1.2}
                  shineSize={12}
                  shineFade={35}
                  thickness={1.5}
                  speed={0.4}
                  followMouse={true}
                  proximity={200}
                >
                  Criar conta grátis
                </SpecularButton>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero section */}
        <section className="relative h-screen overflow-hidden">
          <div className="absolute inset-0 z-0">
            <GradientWaves
              horizonColor="#00D4A4"
              waveColor="#00D4A4"
              crestColor="#000000"
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
              brightness={1.1}
              opacity={1}
              mouseInteraction={false}
              parallaxStrength={0.4}
              grain={true}
              grainIntensity={0.05}
              className="absolute inset-0"
            />
          </div>
          <div className="max-w-7xl mx-auto px-8 relative z-10 h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-12">
              <div className="text-center max-w-3xl flex flex-col items-center gap-5 reveal">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-on-dark leading-[1.1]">
                  Controle de ponto com{" "}<br />
                  <span className="text-brand-green">
                    <TextType
                      text={HERO_WORDS}
                      className="text-brand-green"
                      typingSpeed={80}
                      deletingSpeed={40}
                      pauseDuration={2000}
                      cursorClassName="text-brand-green-deep"
                    />
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-on-dark-muted ">
                  Elimine fraudes, ganhe agilidade e tenha total conformidade legal.
                  Setup em minutos, sem hardware extra.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/company/signup"
                    className="rounded-full bg-brand-green px-8 py-3.5 text-sm font-medium text-primary hover:bg-brand-green-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-colors"
                  >
                    Começar trial de {TRIAL_DAYS} dias
                  </Link>
                  <Link
                    to="/"
                    className="rounded-full border border-slate bg-white/10 px-8 py-3.5 text-sm font-medium text-on-dark hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark transition-colors"
                  >
                    Já tenho conta
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* User features section */}
        <section className="bg-surface max-h-screen py-24">
          <div className="mx-auto max-w-7xl px-8">
            <div className="text-center mb-16 reveal">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink leading-[1.2]">
                Dois lados, uma plataforma
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-steel max-w-2xl mx-auto">
                Funcionário bate ponto no celular. Empresa acompanha tudo no painel. Simples assim.
              </p>
            </div>

            <div className="flex flex-col items-center gap-12 lg:gap-16">
              <div className="w-full max-w-2xl reveal-right">
                <span className="inline-block rounded-full bg-brand-green/15 px-3 py-1 text-sm font-medium text-brand-green">
                  Para você
                </span>
                <h3 className="mt-4 text-xl font-semibold text-ink leading-[1.3]">
                  Ponto direto do celular
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

        {/* Company features section */}
        <section className="bg-[#1a3d4a] max-h-screen py-24">
          <div className="mx-auto max-w-7xl px-8">
            <div className="flex flex-col items-center gap-12 lg:gap-16">
              <div className="w-full max-w-2xl reveal-left">
                <span className="inline-block rounded-full bg-on-dark/10 px-3 py-1 text-sm font-medium text-on-dark-muted">
                  Para sua empresa
                </span>
                <h3 className="mt-4 text-xl font-semibold text-on-dark leading-[1.3]">
                  Gestão de ponto sem dor de cabeça
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
            </div>
          </div>
        </section>

        {/* Pricing section */}
        <PricingSection />

        {/* CTA section */}
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

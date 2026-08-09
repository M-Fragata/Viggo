import { Link } from "react-router";
import TextType from "../components/TextType";
import { PricingSection } from "../components/PricingSection";
import GradientWaves from "../components/GradientWaves";
import SpecularButton from "../components/SpecularButton";
import { ImageCarousel } from "../components/ImageCarousel";
import Silk from "../components/Silk";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { TRIAL_DAYS } from "../../../shared/plans";
import { PricingCalculator } from "../components/PricingCalculator";

import logo from "../assets/logo.png";
import "../scroll-animations.css";

const HERO_WORDS = [
  "reconhecimento facial",
  "geolocalização",
  "anti-fraude",
  "conformidade CLT",
];

const EMPLOYEE_SLIDES = [
  {
    image: "/celular na mao.png",
    title: "Registro de Ponto",
    description: "O funcionário abre o app e registra seu ponto com um toque. A câmera frontal verifica sua identidade em segundos."
  },
  {
    image: "/celular.png",
    title: "Histórico de Pontos",
    description: "Acesse todo seu histórico de registros. Filtre por data, exporte comprovantes e acompanhe sua jornada."
  },
  {
    image: "/viggo front.png",
    title: "Comprovante Instantâneo",
    description: "Cada registro gera um comprovante com foto, localização e horário. Tudo na palma da sua mão."
  }
];

const EMPLOYER_SLIDES = [
  {
    image: "/viggo front.png",
    title: "Painel em Tempo Real",
    description: "Veja em tempo real quem está presente, quem atrasou e quem faltou. Atualizações ao vivo a cada segundo."
  },
  {
    image: "/celular.png",
    title: "Gestão de Equipe",
    description: "Gerencie sua equipe completa de um só lugar. Aprove justificativas, configure jornadas e acompanhe a produtividade."
  },
  {
    image: "/celular na mao.png",
    title: "Relatórios CLT",
    description: "Relatórios automáticos de ponto, banco de horas e folha de pagamento. 100% conformidade com a legislação."
  }
];

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
                    className="rounded-full bg-black px-8 py-3.5 text-sm font-medium text-white hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-colors"
                  >
                    Começar trial de {TRIAL_DAYS} dias
                  </Link>
                  <Link
                    to="/"
                    className="rounded-full border border-black bg-white px-8 py-3.5 text-sm font-medium text-black hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark transition-colors"
                  >
                    Já tenho conta
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Employee perspective section */}
        <section className="relative h-screen overflow-hidden">
          <div className="mx-auto max-w-7xl px-8 h-full flex flex-col items-center justify-center gap-8 relative z-10">
            <div className="text-center">
              <span className="inline-block rounded-full bg-brand-green/15 px-4 py-1.5 text-sm font-medium text-brand-green">
                Para você
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-ink leading-[1.2]">
                Ponto direto do celular
              </h2>
            </div>
            <ImageCarousel slides={EMPLOYEE_SLIDES} />
          </div>
        </section>

        {/* Enterprise perspective section */}
        <section className="relative h-screen overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Silk
              color="#00372B"
              rotation={2.35}
              speed={5.5}
              scale={1}
              noiseIntensity={0.4}
              className="absolute inset-0"
            />
          </div>
          <div className="mx-auto max-w-7xl px-8 h-full flex flex-col items-center justify-center gap-8 relative z-10">
            <div className="text-center">
              <span className="inline-block rounded-full bg-on-dark/10 px-4 py-1.5 text-sm font-medium text-on-dark-muted">
                Para sua empresa
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-on-dark leading-[1.2]">
                Gestão completa de ponto
              </h2>
            </div>
            <ImageCarousel slides={EMPLOYER_SLIDES} />
          </div>
        </section>

        {/* Pricing section */}
        <PricingSection />

        {/* Pricing Calculator */}
        <section className="py-24 bg-canvas-dark">
          <div className="mx-auto max-w-7xl px-8">
            <header className="text-center mb-12 reveal">
              <h2 className="text-3xl font-semibold tracking-tight text-on-dark leading-[1.2]">
                Calcule seu preço
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-on-dark-muted max-w-2xl mx-auto">
                Quanto mais funcionários, maior o valor — mas sempre de forma transparente.
              </p>
            </header>
            <div className="mx-auto reveal">
              <PricingCalculator />
            </div>
          </div>
        </section>

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
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-medium text-primary hover:bg-brand-green-deep
                hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-colors"
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

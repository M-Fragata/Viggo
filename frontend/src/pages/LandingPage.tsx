import { useState } from "react";
import { Link } from "react-router";
import { PricingSection } from "../components/PricingSection";
import { CTASection } from "../components/CTASection";
import GradientWaves from "../components/GradientWaves";
import SpecularButton from "../components/SpecularButton";
import { ImageCarousel } from "../components/ImageCarousel";
import Silk from "../components/Silk";
import { HeroContent } from "../components/HeroContent";
import { AnimatedTitle } from "../components/AnimatedTitle";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Preloader } from "../components/Preloader";

import logo from "../assets/logo.png";
import "../scroll-animations.css";

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
  const [showPreloader, setShowPreloader] = useState(true);
  const [startHeroAnimation, setStartHeroAnimation] = useState(false);

  const handlePreloaderComplete = () => {
    setShowPreloader(false);
    setStartHeroAnimation(true);
  };

  return (
    <div className="min-h-screen bg-black">
      {showPreloader && <Preloader onComplete={handlePreloaderComplete} />}
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
          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10 h-full flex items-center justify-center">
            <HeroContent startAnimation={startHeroAnimation} />
          </div>
        </section>

        {/* Employee perspective section */}
        <section className="relative h-screen overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 h-full flex flex-col items-center justify-center gap-8 relative z-10">
            <div className="text-center">
              <span className="inline-block rounded-full bg-brand-green/15 px-4 py-1.5 text-sm font-medium text-brand-green">
                Para você
              </span>
              <AnimatedTitle
                text="Ponto direto do celular"
                className="mt-4 text-[clamp(1.5rem,4vw,2.25rem)] whitespace-nowrap font-semibold tracking-tight text-on-dark leading-[1.2]"
              />
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
          <div className="mx-auto max-w-7xl px-4 lg:px-8 h-full flex flex-col items-center justify-center gap-8 relative z-10">
            <div className="text-center">
              <span className="inline-block rounded-full bg-on-dark/10 px-4 py-1.5 text-sm font-medium text-on-dark-muted">
                Para sua empresa
              </span>
              <AnimatedTitle
                text="Gestão completa de ponto"
                className="mt-4 text-[clamp(1.5rem,4vw,2.25rem)] whitespace-nowrap font-semibold tracking-tight text-on-dark leading-[1.2]"
              />
            </div>
            <ImageCarousel slides={EMPLOYER_SLIDES} />
          </div>
        </section>

        {/* Pricing section */}
        <PricingSection />

        {/* CTA section */}
        <CTASection />
      </main>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-16">
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

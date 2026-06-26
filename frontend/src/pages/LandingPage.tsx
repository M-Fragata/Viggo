import { Link } from "react-router";
import { TypewriterText } from "../components/TypewriterText";
import { PricingSection } from "../components/PricingSection";
import { HeroMedia } from "../components/HeroMedia";
import { TRIAL_DAYS } from "../../../shared/plans";

const HERO_WORDS = [
  "reconhecimento facial",
  "geolocalização",
  "anti-fraude",
  "conformidade CLT",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Global">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-emerald-600">Viggo</span>
            </div>
            <div className="hidden md:flex md:items-center md:gap-8">
              <Link
                to="/company/signup"
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors"
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8 lg:pb-20">
          <div className="flex flex-col lg:flex-row items-stretch justify-around lg:gap-5">
            <div className="hidden lg:flex justify-center">
              <picture>
                <img
                  src="/celular na mao.png"
                  alt="Viggo - Controle de ponto com reconhecimento facial"
                  className="h-auto object-cover rounded-2xl shadow-xl"
                  loading="eager"
                  fetchPriority="high"
                />
              </picture>
            </div>
            <div className="text-center lg:text-left flex-1 max-w-2xl flex flex-col justify-center gap-5">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Controle de ponto com{" "} <br />
                <span>
                  <TypewriterText
                    words={HERO_WORDS}
                    className="text-emerald-600"
                    typeSpeed={80}
                    deleteSpeed={40}
                    pauseDuration={2000}
                    cursorClassName="text-emerald-500"
                  />
                </span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-xl lg:mx-0">
                Elimine fraudes, ganhe agilidade e tenha total conformidade legal.
                Setup em minutos, sem hardware extra.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/company/signup"
                  className="rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors"
                >
                  Começar trial de {TRIAL_DAYS} dias
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 transition-colors"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:hidden mt-12 mb-12 w-[300px] m-auto">
              <picture>
                <img
                  src="/celular.png"
                  alt="Viggo - Controle de ponto com reconhecimento facial"
                  className="w-full h-auto object-cover rounded-2xl shadow-xl"
                  loading="eager"
                  fetchPriority="high"
                />
              </picture>
            </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: "🔒",
                  title: "Anti-fraude",
                  desc: "Validação facial ao vivo impede buddy punching e marcações indevidas.",
                },
                {
                  icon: "📍",
                  title: "Localização",
                  desc: "GPS preciso valida se o colaborador está no local autorizado.",
                },
                {
                  icon: "📱",
                  title: "Sem hardware",
                  desc: "Funciona no celular do colaborador. Zero custo com equipamentos.",
                },
                {
                  icon: "🚀",
                  title: "Setup rápido",
                  desc: "Empresa cadastrada em minutos. Convide a equipe por link ou QR code.",
                },
              ].map((feature, i) => (
                <div key={i} className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-slate-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="py-20 bg-emerald-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Pronto para modernizar seu controle de ponto?
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Crie sua conta em minutos. Trial gratuito de {TRIAL_DAYS} dias, sem cartão de crédito.
            </p>
            <div className="mt-10">
              <Link
                to="/company/signup"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors"
              >
                Criar minha empresa grátis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            © 2024 Viggo. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
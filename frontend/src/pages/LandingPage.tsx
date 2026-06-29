import { Link } from "react-router";
import { TypewriterText } from "../components/TypewriterText";
import { PricingSection } from "../components/PricingSection";
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
        <section className="h-dvh relative mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8 lg:pb-20">
          <div className="flex flex-col lg:flex-row items-stretch justify-around lg:gap-5">
            <div className="hidden lg:flex justify-center">
              <picture>
                <img
                  src="/viggo front.png"
                  alt="Viggo - Controle de ponto com reconhecimento facial"
                  className="h-auto object-cover rounded-[52px] shadow-xl w-[300px]"
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
                  src="/viggo front.png"
                  alt="Viggo - Controle de ponto com reconhecimento facial"
                  className="w-full h-auto object-cover rounded-[52px] shadow-xl"
                  loading="eager"
                  fetchPriority="high"
                />
              </picture>
            </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Feito para você e para sua empresa
              </h2>
              <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
                Tudo que você precisa para registrar, controlar e gerenciar jornadas de trabalho — em um só lugar.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 h-dvh">
              <div className="w-full lg:w-2/5">
                <img
                  src="/celular na mao.webp"
                  alt="Viggo no celular - Registro de ponto com verificação facial"
                  className="w-full h-auto rounded-2xl shadow-xl object-cover"
                  loading="lazy"
                />
              </div>
              <div className="w-full lg:w-3/5">
                <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  Para você
                </span>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">
                  Seu ponto com segurança e praticidade
                </h3>
                <ul className="mt-6 space-y-4">
                  {[
                    { title: "Verificação facial ao vivo", desc: "Biometria facial garante que só você registra seu ponto." },
                    { title: "Registro geográfico", desc: "GPS registra sua localização exata no momento da marcação." },
                    { title: "Comprovante instantâneo", desc: "Receba comprovante de cada ponto batido em tempo real." },
                    { title: "Histórico completo", desc: "Acesse todos os seus registros a qualquer momento." },
                    { title: "Sem hardware", desc: "Use seu próprio celular. Zero custo com equipamentos." },
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-medium text-slate-900">{feature.title}</span>
                        <span className="text-slate-500"> — {feature.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-16 flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16">
              <div className="w-full lg:w-3/5">
                <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  Para sua empresa
                </span>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">
                  Controle total da jornada de trabalho
                </h3>
                <ul className="mt-6 space-y-4">
                  {[
                    { title: "Dashboard completo", desc: "Visão geral de colaboradores, pontos, pendências e métricas em tempo real." },
                    { title: "Verificação real dos pontos", desc: "Foto, localização e horário exato de cada marcação registrada." },
                    { title: "Criação de funcionários e convites", desc: "Cadastre colaboradores e envie convite para criação de conta." },
                    { title: "Folha de ponto mensal", desc: "Gere automaticamente a folha individual por funcionário." },
                    { title: "Conformidade CLT", desc: "Processos dentro das exigências legais, sem dor de cabeça." },
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-medium text-slate-900">{feature.title}</span>
                        <span className="text-slate-500"> — {feature.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full lg:w-2/5">
                <img
                  src="/viggo front.png"
                  alt="Viggo - Painel administrativo para gestão de ponto"
                  className="w-full h-auto rounded-2xl shadow-xl object-cover"
                  loading="lazy"
                />
              </div>
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
            © 2026 Viggo. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
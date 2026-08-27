import React from "react";
import { Link, useLocation } from "react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import logo from "../../assets/logo.png";

export interface AuthLayoutProps {
  children: React.ReactNode;
  side?: "left" | "right";
  panelTitle: string;
  panelDescription: string;
  panelButton?: {
    text: string;
    to: string;
  };
  formTitle: string;
  formSubtitle?: string;
  showHeader?: boolean;
}

export function AuthLayout({
  children,
  side = "left",
  panelTitle,
  panelDescription,
  panelButton,
  formTitle,
  formSubtitle,
  showHeader,
}: AuthLayoutProps) {
  const location = useLocation();
  const isPanelOnLeft = side === "left";

  // Exibe o header se explicitamente passado como true ou se o usuário veio da Landing Page
  const locationState = location.state as { fromLanding?: boolean } | null;
  const shouldShowHeader = showHeader !== undefined ? showHeader : (locationState?.fromLanding ?? false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-on-dark flex flex-col justify-between selection:bg-brand-green selection:text-black relative overflow-x-hidden font-sans transition-colors duration-200">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-green/10 dark:bg-brand-green/10 blur-[140px] pointer-events-none -z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 dark:bg-emerald-600/10 blur-[160px] pointer-events-none -z-0" />

      {/* Top Header */}
      {shouldShowHeader ? (
        <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between animate-in fade-in duration-300">
          <Link to="/page" className="flex items-center gap-2 group">
            <img
              src={logo}
              alt="Viggo Logo"
              className="w-24 sm:w-28 h-auto drop-shadow-md rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          <Link
            to="/page"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-on-dark-muted hover:text-brand-green dark:hover:text-brand-green transition-all duration-200 bg-white dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao site</span>
          </Link>
        </header>
      ) : (
        <div className="h-4 sm:h-6" />
      )}

      {/* Center Split-Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-auto w-full">
        <div className="w-full max-w-5xl rounded-[28px] overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-200/50 dark:shadow-black/80 grid grid-cols-1 md:grid-cols-12 bg-white dark:bg-[#121214] min-h-[560px] transition-colors duration-200">
          {/* Colored / Branded Hero Panel */}
          <div
            className={`w-full md:col-span-5 p-8 sm:p-10 lg:p-12 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#00d4a4] to-[#009b77] text-black relative ${
              isPanelOnLeft ? "order-1" : "order-1 md:order-2"
            }`}
          >
            {/* Subtle light overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center w-full space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-black leading-snug">
                {panelTitle}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-black/85 leading-relaxed">
                {panelDescription}
              </p>

              {panelButton ? (
                <div className="pt-2">
                  <Link
                    to={panelButton.to}
                    className="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-black text-black hover:bg-black hover:text-white font-bold text-xs uppercase tracking-widest transition-all duration-200 active:scale-95 shadow-md cursor-pointer"
                  >
                    {panelButton.text}
                  </Link>
                </div>
              ) : (
                <div className="pt-2 flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/15 text-black text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Reconhecimento Facial Seguro</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Panel */}
          <div
            className={`w-full md:col-span-7 p-6 sm:p-8 lg:p-12 flex flex-col justify-center bg-white/90 dark:bg-[#141416]/95 backdrop-blur-xl transition-colors duration-200 ${
              isPanelOnLeft ? "order-2" : "order-2 md:order-1"
            }`}
          >
            <div className="w-full space-y-6">
              <header className="text-center space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-on-dark tracking-tight">
                  {formTitle}
                </h1>
                {formSubtitle && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-on-dark-muted">
                    {formSubtitle}
                  </p>
                )}
              </header>

              <div className="relative z-10 w-full">{children}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-on-dark-muted">
        <p>© {new Date().getFullYear()} Viggo Tecnologia. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <Link to="/termos-de-uso" className="hover:text-brand-green transition-colors">Termos de Uso</Link>
          <Link to="/politica-privacidade" className="hover:text-brand-green transition-colors">Privacidade</Link>
          <Link to="/contrato-de-tratamento-de-dados" className="hover:text-brand-green transition-colors">DPA (LGPD)</Link>
        </div>
      </footer>
    </div>
  );
}

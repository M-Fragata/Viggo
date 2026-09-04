import { useState } from "react";
import { Link, Outlet } from "react-router";
import { Menu, X } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { ImpersonationBanner } from "../components/master/ImpersonationBanner";
import { MobileNav } from "../components/MobileNav";
import { NavDrawer } from "../components/navigation/NavDrawer";
import { ForceChangePasswordModal } from "../components/auth/ForceChangePasswordModal";

export function LayoutPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { name, isImpersonated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-slate-100 transition-colors duration-200 relative">
      <ImpersonationBanner />

      {/* HEADER */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 py-3 px-4 sm:px-6 shadow-xs transition-all ${
          isImpersonated ? "top-16" : "top-0"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2">
            <img className="w-28 sm:w-32 h-auto dark:hidden" src="/images/LOGOVERDE.png" alt="Ponto Fragata" />
            <img className="w-28 sm:w-32 h-auto hidden dark:block" src="/images/LOGOBRANCA.png" alt="Ponto Fragata" />
          </Link>

          <div className="flex items-center gap-3">
            {name && (
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium">
                Olá, <strong className="text-emerald-900 dark:text-white font-bold">{name}</strong>
              </p>
            )}

            {/* BOTÃO DO MENU DRAWER */}
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              className="p-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main
        className={`flex-1 flex flex-col justify-start w-full max-w-7xl mx-auto overflow-y-auto pb-20 md:pb-8 px-4 sm:px-6 ${
          isImpersonated ? "pt-32" : "pt-20"
        }`}
      >
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-[#111113] border-t border-slate-200 dark:border-white/10 py-3 px-6 mt-auto z-30 hidden md:block transition-colors">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} Ponto Fragata. Todos os direitos reservados.</p>
          <p>Conforme Portaria 671/2021 MTE & LGPD</p>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAV */}
      <MobileNav />

      {/* NOVO NAV DRAWER LEVE & CATEGORIZADO */}
      <NavDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      {/* MODAL DE TROCA OBRIGATÓRIA DE SENHA TEMPORÁRIA */}
      <ForceChangePasswordModal />
    </div>
  );
}
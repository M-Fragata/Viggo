import { Outlet, Link, NavLink } from "react-router";
import { useState, useEffect, useRef } from "react";
import { LogOut, Menu, X, BarChart3, Building2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { ThemeToggle } from "../common/ThemeToggle";

export function MasterLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, name } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  const navItems = [
    { to: "/master", label: "Métricas & Insights", icon: BarChart3 },
    { to: "/master/companies", label: "Empresas & Contas", icon: Building2 },
    { to: "/master/audit-logs", label: "Logs de Auditoria", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-slate-100 transition-colors duration-200 relative">
      <ImpersonationBanner />

      <header className="bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 py-3 px-4 sm:px-6 shadow-xs sticky top-0 z-[45] w-full max-w-full">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          {/* LOGO */}
          <Link to="/master" className="flex items-center gap-2">
            <img className="w-28 sm:w-32 h-auto dark:hidden" src="/images/LOGOVERDE.png" alt="Ponto Fragata Master" />
            <img className="w-28 sm:w-32 h-auto hidden dark:block" src="/images/LOGOBRANCA.png" alt="Ponto Fragata Master" />
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md">
              Master
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {name && (
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium">
                Olá, <strong className="text-slate-800 dark:text-white font-bold">{name}</strong>
              </p>
            )}
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              className="p-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-3.5 sm:p-6 overflow-x-hidden">
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-[#111113] border-t border-slate-200 dark:border-white/10 py-3 px-6 mt-auto z-30 transition-colors">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-400 dark:text-slate-500 text-xs text-center">
            © {new Date().getFullYear()} Ponto Fragata Master. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Master Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[300px] bg-white dark:bg-[#111113] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/ICONEVERDE.png" alt="Ponto Fragata" className="h-7 w-auto dark:hidden" />
            <img src="/images/ICONEBRANCA.png" alt="Ponto Fragata" className="h-7 w-auto hidden dark:block" />
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded">
              Master
            </span>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            aria-label="Fechar menu"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
            Administração Master
          </span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/master"}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`
              }
            >
              <item.icon size={18} className="shrink-0 text-purple-600 dark:text-purple-400" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-3">
          {/* Seletor de Tema */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Tema
            </span>
            <ThemeToggle size="sm" />
          </div>

          <button
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 font-semibold text-xs py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sair do Master</span>
          </button>
        </div>
      </div>
    </div>
  );
}

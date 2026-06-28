import { Outlet, Link, useLocation } from "react-router";
import { useState } from "react";
import { LogOut, Menu, X, BarChart2, Building2 } from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../hooks/useAuth";
import { ImpersonationBanner } from "./ImpersonationBanner";

export function MasterLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const name = user?.name.split(" ")[0] ?? "";

  const closeMenu = () => setIsMenuOpen(false);

  const navItems = [
    { path: "/master", label: "Métricas", icon: BarChart2 },
    { path: "/master/companies", label: "Empresas", icon: Building2 },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-gray-50 relative">
      <ImpersonationBanner />
      {isMenuOpen && (
        <div className="fixed inset-0 z-31 bg-black/5 backdrop-blur-[1px] transition-opacity" onClick={closeMenu} />
      )}

      <header className="bg-white border-b border-gray-200 py-2 px-6 shadow-sm sticky top-0 z-32">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* LOGO */}
          <div>
            <div>
              <Link to="/" onClick={closeMenu}>
                <img className="w-28 h-auto"
                  src={logo} alt="Logo" />
              </Link>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <div className="flex flex-col justify-center">
              {name ? (
                <p className="text-sm sm:text-base text-gray-600">
                  Olá, <strong className="text-emerald-600">{name}</strong>
                </p>
              ) : null}
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-emerald-600 transition-all duration-300 cursor-pointer rounded-md hover:bg-emerald-50"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        <div className={`flex justify-center text-center
                     overflow-hidden transition-all duration-300 ease-in-out
                    ${isMenuOpen ? "max-h-60 opacity-100 border-t border-emerald-600 mt-4" : "max-h-0 opacity-0 pointer-events-none"}
                `}>
          <nav className="flex flex-col gap-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === item.path
                  ? "bg-emerald-50 text-emerald-600"
                  : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                  }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex justify-center items-center gap-2 text-red-500 font-medium px-4 py-3 hover:text-red-600 transition-colors cursor-pointer border-t border-gray-100 mt-2"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </nav>
        </div>

      </header>

      <main className={`flex-1 flex flex-col w-full mx-auto md:p-6 overflow-y-auto ${isMenuOpen ? "z-30" : "z-40"}`}>
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-3 px-6 mt-auto z-30">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 text-sm text-center">© 2026 Viggo Master. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
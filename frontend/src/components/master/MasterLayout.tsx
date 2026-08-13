import { Outlet, Link, useNavigate } from "react-router";
import { useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../hooks/useAuth";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { StaggeredMenu, type StaggeredMenuHandle, type StaggeredMenuItem } from "../StaggeredMenu";

export function MasterLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<StaggeredMenuHandle>(null);
  const { logout, name } = useAuth();
  const navigate = useNavigate();

  const items: StaggeredMenuItem[] = [
    { label: "Métricas", ariaLabel: "Métricas", link: "/master" },
    { label: "Empresas", ariaLabel: "Empresas", link: "/master/companies" },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-gray-50 relative">
      <ImpersonationBanner />

      <header className="bg-white border-b border-gray-200 py-2 px-6 shadow-sm sticky top-0 z-[45]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* LOGO */}
          <div>
            <div>
              <Link to="/" onClick={() => menuRef.current?.close()}>
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
              onClick={() => (isMenuOpen ? menuRef.current?.close() : menuRef.current?.open())}
              className="p-2 text-emerald-600 transition-all duration-300 cursor-pointer rounded-md hover:bg-emerald-50"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full mx-auto md:p-6 overflow-y-auto">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-3 px-6 mt-auto z-30">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 text-sm text-center">© 2026 Viggo Master. Todos os direitos reservados.</p>
        </div>
      </footer>

      <StaggeredMenu
        ref={menuRef}
        isFixed
        showHeader={false}
        colors={["#064e3b", "#065f46", "#047857", "#059669"]}
        accentColor="#059669"
        items={items}
        displaySocials={false}
        displayItemNumbering={true}
        onMenuOpen={() => setIsMenuOpen(true)}
        onMenuClose={() => setIsMenuOpen(false)}
        onItemClick={(item) => navigate(item.link)}
        footerContent={
          <button
            onClick={() => {
              menuRef.current?.close();
              logout();
            }}
            className="flex justify-center items-center gap-2 text-red-500 font-medium px-3 py-2 hover:text-red-600 transition-colors cursor-pointer border-t border-gray-100 mt-2 pt-4"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        }
      />
    </div>
  );
}

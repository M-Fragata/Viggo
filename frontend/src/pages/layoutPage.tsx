import { useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { LogOut, Menu, X } from "lucide-react";

import logo from "../assets/logo.png"
import { useAuth } from "../hooks/useAuth";
import { ImpersonationBanner } from "../components/master/ImpersonationBanner";
import { MobileNav } from "../components/MobileNav";
import { TotemActivateModal } from "../components/admin/TotemActivateModal";
import { StaggeredMenu, type StaggeredMenuHandle, type StaggeredMenuItem } from "../components/StaggeredMenu";

export function LayoutPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTotemModalOpen, setIsTotemModalOpen] = useState(false);
    const menuRef = useRef<StaggeredMenuHandle>(null);
    const { name, logout, isImpersonated, isEnterpriseAdmin, isMaster } = useAuth();
    const navigate = useNavigate();

    const handleTotemClick = () => {
        const token = localStorage.getItem("@viggo:totem");
        if (token) {
            navigate("/totem");
        } else {
            setIsTotemModalOpen(true);
        }
    };

    const commonItems: StaggeredMenuItem[] = [
        { label: "Bater Ponto", ariaLabel: "Bater Ponto", link: "/ponto" },
        { label: "Histórico", ariaLabel: "Histórico", link: "/pontos" },
        { label: "Meus Dados", ariaLabel: "Meus Dados", link: "/meus-dados" },
        { label: "Justificativas", ariaLabel: "Justificativas", link: "/justificativas" },
    ];

    const adminItems: StaggeredMenuItem[] = [
        { label: "Painel Admin", ariaLabel: "Painel Admin", link: "/" },
        { label: "Funcionários", ariaLabel: "Funcionários", link: "/funcionarios" },
        { label: "Presentes", ariaLabel: "Presentes", link: "/presentes" },
        { label: "Folha Mensal", ariaLabel: "Folha Mensal", link: "/folha-mensal" },
        { label: "Horários", ariaLabel: "Horários", link: "/horarios" },
        { label: "Convites", ariaLabel: "Convites", link: "/convites" },
        { label: "Meu Plano", ariaLabel: "Meu Plano", link: "/plano" },
        { label: "Modo Totem", ariaLabel: "Modo Totem", link: "/totem" },
    ];

    const items = isEnterpriseAdmin || isMaster ? [...commonItems, ...adminItems] : commonItems;

    const handleItemClick = (item: StaggeredMenuItem) => {
        if (item.link === "/totem") {
            handleTotemClick();
        } else {
            navigate(item.link);
        }
    };

    return (
        <div className="min-h-screen flex flex-col overflow-hidden bg-gray-50 relative">
            <ImpersonationBanner />

            {/* HEADER */}
            <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 py-2 px-6 shadow-sm ${isImpersonated ? "top-16" : "top-0"}`}>
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

                    <div className="flex justify-center gap-2 items-center">
                        <div className="flex flex-col justify-center">
                            {name ? (
                                <p className="text-sm sm:text-base text-gray-600">
                                    Olá, <strong className="text-emerald-600">{name}</strong>
                                </p>
                            ) : null}
                        </div>
                        {/* HAMBURGER EM TODAS AS TELAS */}
                        <button
                            onClick={() => (isMenuOpen ? menuRef.current?.close() : menuRef.current?.open())}
                            className="p-2 text-emerald-600 transition-all duration-300 cursor-pointer rounded-md hover:bg-emerald-50"
                        >
                            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* CONTEÚDO PRINCIPAL */}
            <main className={`flex-1 flex flex-col justify-start w-full mx-auto overflow-y-auto pb-20 md:pb-6 md:px-6 ${isImpersonated ? "pt-32" : "pt-16"}`}>
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="bg-white border-t border-gray-200 py-3 px-6 mt-auto z-30 hidden md:block">
                <div className="max-w-7xl mx-auto">
                    <p className="text-gray-500 text-sm text-center">
                        © 2026 Viggo. Todos os direitos reservados.
                    </p>
                </div>
            </footer>

            {/* MOBILE BOTTOM NAV */}
            <MobileNav />

            {/* MENU ANIMADO (PAINEL DESLIZANTE) */}
            <StaggeredMenu
                ref={menuRef}
                isFixed
                showHeader={false}
                colors={["#064e3b", "#065f46", "#047857", "#059669"]}
                accentColor="#059669"
                items={items}
                displaySocials={false}
                displayItemNumbering={true}
                offsetTop={isImpersonated ? 64 : 0}
                onMenuOpen={() => setIsMenuOpen(true)}
                onMenuClose={() => setIsMenuOpen(false)}
                onItemClick={handleItemClick}
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

            {/* MODAL ATIVAÇÃO TOTEM */}
            <TotemActivateModal
                isOpen={isTotemModalOpen}
                onClose={() => setIsTotemModalOpen(false)}
                onActivated={() => navigate("/totem")}
            />
        </div>
    );
}
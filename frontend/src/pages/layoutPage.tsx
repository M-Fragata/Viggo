import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { LogOut, Menu, X } from "lucide-react";

import logo from "../assets/logo.png"
import { useAuth } from "../hooks/useAuth";
import { ImpersonationBanner } from "../components/master/ImpersonationBanner";
import { MobileNav } from "../components/MobileNav";
import { TotemActivateModal } from "../components/admin/TotemActivateModal";

export function LayoutPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTotemModalOpen, setIsTotemModalOpen] = useState(false);
    const { name, logout, isImpersonated, isEnterpriseAdmin, isMaster } = useAuth();
    const navigate = useNavigate();

    const closeMenu = () => setIsMenuOpen(false);

    const handleTotemClick = () => {
        const token = localStorage.getItem("@viggo:totem");
        if (token) {
            navigate("/totem");
        } else {
            setIsTotemModalOpen(true);
        }
        closeMenu();
    };

    return (
        <div className="min-h-screen flex flex-col overflow-hidden bg-gray-50 relative">
            <ImpersonationBanner />

            {/* OVERLAY: Aparece apenas quando o menu está aberto */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-31 bg-black/5 backdrop-blur-[1px] transition-opacity"
                    onClick={closeMenu}
                />
            )}

            {/* HEADER */}
            <header className={`bg-white border-b border-gray-200 py-2 px-6 shadow-sm sticky z-32 ${isImpersonated ? "top-16" : "top-0"}`}>
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
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-emerald-600 transition-all duration-300 cursor-pointer rounded-md hover:bg-emerald-50"
                        >
                            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>

                {/* MENU DROPDOWN */}
                <div className={`flex justify-center text-center
                     overflow-y-auto transition-all duration-300 ease-in-out
                    ${isMenuOpen ? "max-h-[640px] opacity-100 border-t border-emerald-600 mt-4" : "max-h-0 opacity-0 pointer-events-none"}
                `}>
                    <nav className="flex flex-col gap-2 py-4 w-full mx-auto px-2">
                        {/* Páginas comuns (todos os usuários) */}
                        <Link
                            to="/ponto"
                            onClick={closeMenu}
                            className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                        >
                            Bater Ponto
                        </Link>
                        <Link
                            to="/pontos"
                            onClick={closeMenu}
                            className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                        >
                            Histórico
                        </Link>
                        <Link
                            to="/meus-dados"
                            onClick={closeMenu}
                            className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                        >
                            Meus Dados
                        </Link>

                        {/* Divisor verde + seção admin */}
                        {(isEnterpriseAdmin || isMaster) && (
                            <>
                                <div className="border-b-2 border-emerald-500 my-2 mx-2" />
                                <Link
                                    to="/"
                                    onClick={closeMenu}
                                    className="text-emerald-700 hover:bg-emerald-50 font-semibold px-3 py-2 rounded-xl transition-colors"
                                >
                                    Painel Admin
                                </Link>
                                <Link
                                    to="/funcionarios"
                                    onClick={closeMenu}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                                >
                                    Funcionários
                                </Link>
                                <Link
                                    to="/presentes"
                                    onClick={closeMenu}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                                >
                                    Presentes
                                </Link>
                                <Link
                                    to="/folha-mensal"
                                    onClick={closeMenu}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                                >
                                    Folha Mensal
                                </Link>
                                <Link
                                    to="/horarios"
                                    onClick={closeMenu}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                                >
                                    Horários
                                </Link>
                                <Link
                                    to="/convites"
                                    onClick={closeMenu}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                                >
                                    Convites
                                </Link>
                                <Link
                                    to="/justificativas"
                                    onClick={closeMenu}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                                >
                                    Justificativas
                                </Link>
                                <Link
                                    to="/plano"
                                    onClick={closeMenu}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors"
                                >
                                    Meu Plano
                                </Link>
                                <button
                                    onClick={handleTotemClick}
                                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer"
                                >
                                    Modo Totem
                                </button>
                            </>
                        )}

                        <button
                            onClick={logout}
                            className="flex justify-center items-center gap-2 text-red-500 font-medium px-3 py-2 hover:text-red-600 transition-colors cursor-pointer border-t border-gray-100 mt-2 pt-4"
                        >
                            <LogOut size={20} />
                            <span>Sair</span>
                        </button>
                    </nav>
                </div>
            </header>

            {/* CONTEÚDO PRINCIPAL */}
            <main className={`flex-1 flex flex-col justify-start w-full mx-auto md:p-6 overflow-y-auto pb-20 md:pb-6 ${isMenuOpen ? "z-30" : "z-40"}`}>
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

            {/* MODAL ATIVAÇÃO TOTEM */}
            <TotemActivateModal
                isOpen={isTotemModalOpen}
                onClose={() => setIsTotemModalOpen(false)}
                onActivated={() => navigate("/totem")}
            />
        </div>
    );
}
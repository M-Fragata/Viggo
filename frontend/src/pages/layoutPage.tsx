import { useState, useEffect } from "react";
import { Link, Outlet } from "react-router";
import { LogOut, MapPin, Menu, X } from "lucide-react";

import logo from "../assets/logo.png"

export function LayoutPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [name, setName] = useState("");

    const handleLogout = () => {
        localStorage.removeItem("@viggo:token");
        localStorage.removeItem("@viggo:user");
        window.location.href = "/";
    };

    const closeMenu = () => setIsMenuOpen(false);

    useEffect(() => {
        const user = localStorage.getItem("@viggo:user");
        setName(user ? JSON.parse(user).name : "");
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 relative">
            
            {/* OVERLAY: Aparece apenas quando o menu está aberto */}
            {isMenuOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px] transition-opacity"
                    onClick={closeMenu} 
                />
            )}

            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm sticky top-0 z-50">
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

                {/* MENU DROPDOWN */}
                <div className={`flex justify-center text-center
                     overflow-hidden transition-all duration-300 ease-in-out
                    ${isMenuOpen ? "max-h-60 opacity-100 border-t border-emerald-600 mt-4" : "max-h-0 opacity-0 pointer-events-none"}
                `}>
                    <nav className="flex flex-col gap-4 py-4 w-full">
                        <Link 
                            to="/" 
                            onClick={closeMenu}
                            className="text-gray-600 hover:text-emerald-600 font-medium px-2 py-1 transition-colors"
                        >
                            Bater Ponto
                        </Link>
                        <Link 
                            to="/pontos" 
                            onClick={closeMenu}
                            className="text-gray-600 hover:text-emerald-600 font-medium px-2 py-1 transition-colors"
                        >
                            Histórico
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex justify-center items-center gap-2 text-red-500 font-medium px-2 py-1 hover:text-red-600 transition-colors cursor-pointer border-t border-gray-100 mt-2 pt-4"
                        >
                            <LogOut size={20} />
                            <span>Sair</span>
                        </button>
                    </nav>
                </div>
            </header>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 z-30">
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="bg-white border-t border-gray-200 py-6 px-6 mt-auto z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm text-center">
                        © 2026 Viggo Sistemas. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <MapPin size={14} />
                        <span>Maricá, RJ</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
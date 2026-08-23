import { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  X,
  Fingerprint,
  Clock,
  User,
  ClipboardList,
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  Calendar,
  CreditCard,
  Mail,
  TabletSmartphone,
  LogOut,
  Building2,
} from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../hooks/useAuth";
import { ThemeToggle } from "../common/ThemeToggle";

export interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
  const { name, company, logout, isEnterpriseAdmin, isMaster } = useAuth();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);

  const isAdminOrMaster = isEnterpriseAdmin || isMaster;

  // Fechar ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevenir scroll do body quando o drawer estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLinkClick = (to: string) => {
    onClose();
    navigate(to);
  };

  const personalItems = [
    { to: "/ponto", label: "Bater Ponto", icon: Fingerprint },
    { to: "/pontos", label: "Histórico de Pontos", icon: Clock },
    { to: "/justificativas", label: "Minhas Justificativas", icon: ClipboardList },
    { to: "/meus-dados", label: "Meus Dados", icon: User },
  ];

  const adminManagementItems = [
    { to: "/", label: "Visão Geral", icon: LayoutDashboard },
    { to: "/funcionarios", label: "Colaboradores", icon: Users },
    { to: "/presentes", label: "Quem está Presente", icon: UserCheck },
    { to: "/folha-mensal", label: "Folha Mensal & Espelho", icon: FileText },
    { to: "/horarios", label: "Escalas & Horários", icon: Calendar },
  ];

  const adminSystemItems = [
    { to: "/totem", label: "Modo Totem", icon: TabletSmartphone },
    { to: "/convites", label: "Convites de Acesso", icon: Mail },
    { to: "/plano", label: "Assinatura & Plano", icon: CreditCard },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[320px] sm:max-w-[360px] bg-white dark:bg-[#111113] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Viggo" className="h-7 w-auto" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Seção Pessoal */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
              Meu Espaço
            </span>
            {personalItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => handleLinkClick(item.to)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`
                }
              >
                <item.icon size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Seção Gestão da Empresa (Apenas Admin/Master) */}
          {isAdminOrMaster && (
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
                Gestão da Empresa
              </span>
              {adminManagementItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => handleLinkClick(item.to)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    }`
                  }
                >
                  <item.icon size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}

          {/* Seção Sistema & Totem (Apenas Admin/Master) */}
          {isAdminOrMaster && (
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
                Sistema & Totem
              </span>
              {adminSystemItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => handleLinkClick(item.to)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    }`
                  }
                >
                  <item.icon size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}

          {/* Seção Tema (Abaixo de borda, botões na horizontal) */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1">
              TEMA
            </span>
            <div className="px-1">
              <ThemeToggle fullWidth size="md" />
            </div>
          </div>
        </div>

        {/* Drawer Footer: User Profile & Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {name ? name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {name || "Usuário"}
                </p>
                {company && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate flex items-center gap-1">
                    <Building2 size={10} className="shrink-0" />
                    <span>{company}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

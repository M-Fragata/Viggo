import { NavLink } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Fingerprint, Clock, User, LayoutDashboard } from "lucide-react";

const NAV_ITEMS_EMPLOYEE = [
  { to: "/ponto", icon: Fingerprint, label: "Ponto" },
  { to: "/pontos", icon: Clock, label: "Histórico" },
  { to: "/meus-dados", icon: User, label: "Meus Dados" },
  { to: "/justificativas", icon: LayoutDashboard, label: "Justificativas" },
] as const;

const NAV_ITEMS_ADMIN = [
  { to: "/", icon: LayoutDashboard, label: "Painel" },
  { to: "/meus-dados", icon: User, label: "Meus Dados" },
  { to: "/ponto", icon: Fingerprint, label: "Ponto" },
  { to: "/pontos", icon: Clock, label: "Histórico" },
] as const;

export function MobileNav() {
  const { isEnterpriseAdmin, isMaster } = useAuth();
  const items = isEnterpriseAdmin || isMaster ? NAV_ITEMS_ADMIN : NAV_ITEMS_EMPLOYEE;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-full h-full text-xs font-semibold transition-colors ${
                isActive
                  ? "text-emerald-600"
                  : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

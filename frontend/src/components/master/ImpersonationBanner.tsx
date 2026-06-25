import { AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function ImpersonationBanner() {
  const { isImpersonated, impersonatedCompanyName, user, stopImpersonation } = useAuth();

  if (!isImpersonated) return null;

  const masterName = user?.name || "Master";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white shadow-lg border-b-2 border-amber-700">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Modo Impersonação Ativo</p>
            <p className="text-amber-100 text-xs truncate">
              Você está como <strong>{impersonatedCompanyName}</strong> (Master: {masterName})
            </p>
          </div>
        </div>
        <button
          onClick={stopImpersonation}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/20 whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" />
          Sair da Impersonação
        </button>
      </div>
    </div>
  );
}
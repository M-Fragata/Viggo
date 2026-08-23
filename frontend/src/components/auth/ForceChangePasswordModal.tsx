import { useState } from "react";
import { Lock, KeyRound, ShieldAlert, CheckCircle2, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

export function ForceChangePasswordModal() {
  const { user, clearMustChangePassword } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("A nova senha deve conter no mínimo 8 caracteres.");
      return;
    }

    if (newPassword.toLowerCase().endsWith("@viggo") || newPassword.toLowerCase().endsWith("viggo")) {
      setError("A sua senha definitiva não pode terminar com @viggo.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await api.auth.changePassword(newPassword);
      toast.success("Senha pessoal cadastrada com sucesso!");
      clearMustChangePassword();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <KeyRound size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Crie sua Senha Pessoal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Primeiro acesso detectado
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Você acessou com uma <strong>senha temporária</strong>. Por segurança e conformidade com a Portaria 671 MTE, defina agora sua senha pessoal exclusiva.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || newPassword.length < 8 || !confirmPassword}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvando Senha...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Definir Senha e Acessar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

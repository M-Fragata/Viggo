import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "../hooks/useAuth";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";

const loginSchema = z.object({
  email: z.email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve conter no mínimo 6 caracteres"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carrega e-mail lembrado ao montar
  useEffect(() => {
    const savedEmail = localStorage.getItem("@viggo:saved_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      if (rememberMe) {
        localStorage.setItem("@viggo:saved_email", email.trim());
      } else {
        localStorage.removeItem("@viggo:saved_email");
      }

      const user = await login(email.trim(), password);

      toast.success(`Bem-vindo, ${user.name || "Colaborador"}!`);

      if (user.role === "MASTER") {
        navigate("/master");
      } else if (user.role === "ENTERPRISE_ADMIN") {
        navigate("/");
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "E-mail ou senha incorretos.";
      setErrors({ general: message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      side="left"
      panelTitle="VIGGO"
      panelDescription="Bem vindo de volta!"
      formTitle="Acesso ao Sistema"
      formSubtitle="Informe seu e-mail e senha cadastrados"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-400 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        <AuthInput
          name="email"
          type="email"
          placeholder="Seu e-mail"
          icon={Mail}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          autoComplete="username"
          autoFocus
        />

        <div className="space-y-2">
          <AuthInput
            name="password"
            isPassword
            placeholder="Sua senha"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded bg-slate-100 dark:bg-white/[0.05] border-slate-300 dark:border-white/20 text-brand-green focus:ring-brand-green focus:ring-offset-white dark:focus:ring-offset-black accent-brand-green cursor-pointer"
              />
              <span className="text-xs text-slate-600 dark:text-on-dark-muted group-hover:text-slate-900 dark:group-hover:text-on-dark transition-colors">
                Lembrar e-mail
              </span>
            </label>

            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-xs text-slate-600 dark:text-on-dark-muted hover:text-brand-green dark:hover:text-brand-green transition-colors cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full transition-all duration-200 shadow-lg shadow-brand-green/20 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar</span>
              </>
            )}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
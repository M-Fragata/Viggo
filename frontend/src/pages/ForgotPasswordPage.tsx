import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Loader2, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "../services/api";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";

type Step = "email" | "code" | "password";

const emailSchema = z.object({
  email: z.email("Digite um e-mail válido"),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0].message });
      return;
    }
    try {
      setIsSubmitting(true);
      await api.auth.forgotPassword(email.trim());
      toast.success("Se o e-mail existir, um código foi enviado.");
      setStep("code");
      setCode(["", "", "", "", "", ""]);
      setAttempts(0);
      setCooldown(120);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar código.";
      toast.error(msg);
      setErrors({ email: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    // allow paste of full code
    if (val.length > 1) {
      const digits = val.replace(/\D/g, "").slice(0, 6).split("");
      for (let i = 0; i < 6; i++) next[i] = digits[i] ?? "";
      setCode(next);
      const lastIdx = Math.min(digits.length, 6) - 1;
      if (digits.length === 6) {
        void handleVerify(next.join(""));
      } else {
        inputRefs.current[lastIdx]?.focus();
      }
      return;
    }
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    const joined = next.join("");
    if (joined.length === 6 && next.every((d) => d !== "")) {
      void handleVerify(joined);
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const c = fullCode ?? code.join("");
    if (c.length !== 6) {
      setErrors({ code: "Digite os 6 dígitos." });
      return;
    }
    try {
      setIsSubmitting(true);
      setErrors({});
      const res = await api.auth.verifyResetCode(email.trim(), c);
      setToken(res.token);
      toast.success("Código verificado!");
      setStep("password");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código inválido.";
      // tentar extrair tentativas
      const match = msg.match(/Tentativas:\s*(\d+)\/5/);
      if (match) setAttempts(parseInt(match[1], 10));
      else if (msg.includes("máximo de tentativas")) setAttempts(5);
      setErrors({ code: msg });
      toast.error(msg);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      setIsSubmitting(true);
      await api.auth.forgotPassword(email.trim());
      toast.success("Novo código enviado.");
      setCooldown(120);
      setAttempts(0);
      setCode(["", "", "", "", "", ""]);
      setErrors({});
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao reenviar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = passwordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    try {
      setIsSubmitting(true);
      await api.auth.resetPassword(token, password);
      toast.success("Senha redefinida com sucesso! Faça login.");
      navigate("/", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      side="left"
      panelTitle="Recupere seu acesso"
      panelDescription="Não se preocupe, acontece com todos. Vamos te ajudar a voltar ao Viggo."
      formTitle={
        step === "email"
          ? "Esqueceu a senha?"
          : step === "code"
            ? "Digite o código"
            : "Nova senha"
      }
      formSubtitle={
        step === "email"
          ? "Informe seu e-mail para receber o código de 6 dígitos"
          : step === "code"
            ? `Enviamos um código para ${email}`
            : "Defina sua nova senha de acesso"
      }
    >
      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <AuthInput
            name="email"
            type="email"
            placeholder="Seu e-mail"
            icon={Mail}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                const next = { ...errors };
                delete next.email;
                setErrors(next);
              }
            }}
            error={errors.email}
            autoComplete="email"
            autoFocus
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full transition-all duration-200 shadow-lg shadow-brand-green/20 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <span>Enviar código</span>
            )}
          </button>

          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-on-dark-muted hover:text-brand-green transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao login
          </Link>
        </form>
      )}

      {step === "code" && (
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleCodeChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-lg font-bold tracking-widest bg-slate-50 dark:bg-white/[0.04] border rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all
                  ${errors.code ? "border-red-500" : "border-slate-200 dark:border-white/10"}
                `}
                disabled={isSubmitting || attempts >= 5}
              />
            ))}
          </div>

          {errors.code && (
            <p className="text-xs text-red-500 text-center">{errors.code}</p>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-on-dark-muted">
              Tentativas: {attempts}/5
            </span>
            {attempts >= 5 && (
              <span className="text-red-500 font-medium">Limite atingido — reenvie o código</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={isSubmitting || code.join("").length !== 6 || attempts >= 5}
              className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full transition-all disabled:opacity-50 uppercase tracking-wider text-xs"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Verificar código</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isSubmitting}
              className="w-full py-2.5 text-xs font-medium text-slate-600 dark:text-on-dark-muted hover:text-brand-green disabled:opacity-40 transition-colors"
            >
              {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setErrors({});
              }}
              className="text-xs text-slate-500 hover:text-brand-green flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Alterar e-mail
            </button>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
              O código expira em <strong>10 minutos</strong> e pode ser usado apenas 5 vezes. Verifique também a caixa de spam.
            </p>
          </div>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <AuthInput
            name="password"
            isPassword
            placeholder="Nova senha (mínimo 8 caracteres)"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                const next = { ...errors };
                delete next.password;
                setErrors(next);
              }
            }}
            error={errors.password}
            autoFocus
          />
          <AuthInput
            name="confirmPassword"
            isPassword
            placeholder="Confirmar nova senha"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) {
                const next = { ...errors };
                delete next.confirmPassword;
                setErrors(next);
              }
            }}
            error={errors.confirmPassword}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full transition-all shadow-lg shadow-brand-green/20 disabled:opacity-50 uppercase tracking-wider text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redefinindo...</span>
              </>
            ) : (
              <span>Redefinir senha</span>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

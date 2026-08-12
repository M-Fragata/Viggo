import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { usePublicInvite } from "../../hooks/useInviteTokens";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import logo from "../../assets/logo.png";

const acceptInviteSchema = z.object({
  email: z.email("Email inválido"),
  name: z.string().min(3, "O nome deve conter no mínimo 3 caracteres"),
  password: z.string().min(8, "A senha deve conter no mínimo 8 caracteres"),
  confirmPassword: z.string(),
  aceiteTermos: z.boolean().refine((v) => v === true, {
    message: "Você precisa aceitar os Termos de Uso",
  }),
  aceiteBiometria: z.boolean().refine((v) => v === true, {
    message: "Você precisa autorizar o uso da biometria facial",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSession } = useAuth();
  const { invite, isLoading, error, fetchInvite, acceptInvite } = usePublicInvite();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (token) {
      fetchInvite(token);
    }
  }, [token, fetchInvite]);

  const onSubmit = async (data: AcceptInviteFormData) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      const result = await acceptInvite({
        token,
        email: data.email,
        name: data.name,
        password: data.password,
        confirmPassword: data.confirmPassword,
        aceiteTermos: data.aceiteTermos,
        aceiteBiometria: data.aceiteBiometria,
      });
      setSession(result.user, result.token, result.company.name);
      toast.success("Conta criada com sucesso!");
      navigate("/");
    } catch (err) {
      toast.error("Erro ao aceitar convite", { description: err instanceof Error ? err.message : "Tente novamente" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="Viggo Logo" className="w-32 h-auto" />
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-slate-500">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2">
        <div className="w-full max-w-7xl text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Convite Inválido</h1>
          <p className="text-slate-500 mb-6">{error || "Este convite não existe ou já expirou."}</p>
          <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao Login
          </Link>
        </div>
      </div>
    );
  }

  const { company, expiresAt } = invite;
  const isExpired = new Date(expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2">
        <div className="w-full max-w-7xl text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Convite Expirado</h1>
          <p className="text-slate-500 mb-6">Este convite expirou em {new Date(expiresAt).toLocaleDateString("pt-BR")}.</p>
          <p className="text-slate-500 mb-6">Peça ao administrador para enviar um novo convite.</p>
          <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2">
      <div className="flex flex-col md:flex-row w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden h-full md:h-[600px]">
        {/* LADO ESQUERDO: Info da empresa */}
        <section className="flex flex-col items-center justify-center bg-emerald-400 w-full md:w-1/2 h-24 md:h-full p-4 md:p-8 transition-all duration-500 md:rounded-l-2xl md:rounded-t-none rounded-t-2xl">
          <img src={logo} alt="Viggo Logo" className="w-32 md:w-56 h-auto drop-shadow-xl rounded-2xl" />
        </section>

        {/* LADO DIREITO: Form de cadastro */}
        <main className="flex-1 min-h-0 flex flex-col items-center p-6 md:p-16 border-emerald-400 border-2 md:rounded-r-2xl md:rounded-b-none rounded-b-2xl overflow-y-auto">
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-right duration-700">
            <header className="text-center md:text-left">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                Complete seu cadastro
              </h1>
              <p className="text-slate-500 mt-1">Sua conta será vinculada à empresa <strong className="text-emerald-600">{company.name}</strong></p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <label htmlFor="email" className="sr-only">Email</label>
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    {...register("email")}
                    id="email"
                    type="email"
                    placeholder="Seu email"
                    className="w-full pl-12 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div className="relative group">
                  <label htmlFor="name" className="sr-only">Seu nome</label>
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    {...register("name")}
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    className="w-full pl-12 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div className="relative group">
                  <label htmlFor="password" className="sr-only">Senha</label>
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    {...register("password")}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha (mín. 8 caracteres)"
                    className="w-full pl-12 pr-12 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                </div>

                <div className="relative group">
                  <label htmlFor="confirmPassword" className="sr-only">Confirmar senha</label>
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    {...register("confirmPassword")}
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    className="w-full pl-12 pr-12 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="aceiteTermos"
                    {...register("aceiteTermos")}
                    required
                    className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="aceiteTermos" className="text-sm text-slate-600 leading-relaxed">
                    Li e aceito os{" "}
                    <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-700">
                      Termos de Uso
                    </a>{" "}
                    e a{" "}
                    <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-700">
                      Política de Privacidade
                    </a>
                    , autorizando o tratamento dos meus dados pessoais para fins de
                    controle de ponto eletrônico.
                  </label>
                </div>
                {errors.aceiteTermos && (
                  <p className="text-sm text-red-500 ml-7">{errors.aceiteTermos.message}</p>
                )}

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="aceiteBiometria"
                    {...register("aceiteBiometria")}
                    required
                    className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="aceiteBiometria" className="text-sm text-slate-600 leading-relaxed">
                    Autorizo expressamente o uso da minha{" "}
                    <a href="/consentimento-biometria" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-700">
                      biometria facial
                    </a>{" "}
                    (vetor matemático de 128 dimensões) exclusivamente para validação
                    de identidade no registro de ponto eletrônico, conforme Art. 11
                    da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                  </label>
                </div>
                {errors.aceiteBiometria && (
                  <p className="text-sm text-red-500 ml-7">{errors.aceiteBiometria.message}</p>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none uppercase tracking-widest text-xs cursor-pointer"
                >
                  {isSubmitting ? "Criando conta..." : "Criar conta e entrar"}
                </button>
                <Link to="/" className="text-center text-slate-600 hover:text-emerald-500 text-sm transition-colors">
                  Já tem conta? Faça login
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
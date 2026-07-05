import { useActionState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { companySignupSchema, formatCpf, formatCnpj, validateCpf, validateCnpj } from "../schemas/companySignup";

export function CompanySignupPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [state, formAction, isPending] = useActionState(handleSubmit, {
    message: "",
    fieldErrors: {},
    payload: {
      name: "",
      email: "",
      cpf: "",
      cnpj: "",
      companyName: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleSubmit(_prevState: unknown, formData: FormData) {
    const rawData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      cpf: formData.get("cpf") as string,
      cnpj: formData.get("cnpj") as string,
      companyName: formData.get("companyName") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const parsed = companySignupSchema.safeParse(rawData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      });
      return { message: "", fieldErrors, payload: rawData };
    }

    const cpfDigits = rawData.cpf.replace(/\D/g, "");
    if (!validateCpf(cpfDigits)) {
      return { message: "", fieldErrors: { cpf: "CPF inválido" }, payload: rawData };
    }

    if (rawData.cnpj) {
      const cnpjDigits = rawData.cnpj.replace(/\D/g, "");
      if (!validateCnpj(cnpjDigits)) {
        return { message: "", fieldErrors: { cnpj: "CNPJ inválido" }, payload: rawData };
      }
    }

    try {
      const response = await api.auth.signup({
        name: rawData.name,
        email: rawData.email,
        cpf: cpfDigits,
        cnpj: rawData.cnpj ? rawData.cnpj.replace(/\D/g, "") : undefined,
        companyName: rawData.companyName,
        password: rawData.password,
        confirmPassword: rawData.confirmPassword,
      });

      setSession(response.user, response.token, response.company.name);
      navigate("/admin");
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("Dados inválidos")) {
        try {
          const parsedError = JSON.parse(err.message.replace("Dados inválidos: ", ""));
          const fieldErrors: Record<string, string> = {};
          parsedError.errors?.forEach((e: { path: string[]; message: string }) => {
            fieldErrors[e.path[0]] = e.message;
          });
          return { message: "", fieldErrors, payload: rawData };
        } catch {
          return { message: "Dados inválidos. Verifique os campos.", fieldErrors: {}, payload: rawData };
        }
      }
      return { message: err.message || "Erro ao criar empresa. Tente novamente.", fieldErrors: {}, payload: rawData };
    }

    return { message: "", fieldErrors: {}, payload: rawData };
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    e.target.value = formatted;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    e.target.value = formatted;
  };

  return (
    <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2 my-67 md:my-0">
      <div className="flex flex-col md:flex-row w-full max-w-5xl rounded-l-2xl shadow-2xl min-h-[500px] md:h-[700px] ">
        <section className="flex flex-col items-center justify-center bg-emerald-400 w-full md:w-1/2 h-1/3 md:h-full p-8 transition-all duration-500 md:rounded-l-2xl md:rounded-t-none rounded-t-2xl">
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-left duration-700 rounded-2xl">
            <span className="text-4xl font-bold text-white">Viggo</span>
            <p className="text-white/90 text-center">
              Crie sua empresa e comece a controlar ponto com reconhecimento facial em minutos.
            </p>
          </div>
        </section>

        <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 border-emerald-400 border-2 md:rounded-r-2xl md:rounded-b-none rounded-b-2xl overflow-y-auto">
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-right duration-700">
            <header className="text-center md:text-left">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                Criar conta da <span className="text-emerald-500">empresa</span>
              </h1>
              <p className="mt-2 text-slate-600">Preencha os dados para iniciar seu trial de 30 dias</p>
            </header>

            <form action={formAction} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    Seu nome completo
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="João da Silva"
                    defaultValue={state.payload.name}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                    aria-invalid={!!state.fieldErrors.name}
                  />
                  {state.fieldErrors.name && (
                    <p className="mt-1 text-sm text-red-500">{state.fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb- mb-1">
                    E-mail
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="joao@empresa.com"
                    defaultValue={state.payload.email}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                    aria-invalid={!!state.fieldErrors.email}
                  />
                  {state.fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-500">{state.fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="cpf" className="block text-sm font-medium text-slate-700 mb-1">
                    CPF
                  </label>
                  <Input
                    id="cpf"
                    name="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    defaultValue={state.payload.cpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                    aria-invalid={!!state.fieldErrors.cpf}
                  />
                  {state.fieldErrors.cpf && (
                    <p className="mt-1 text-sm text-red-500">{state.fieldErrors.cpf}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="cnpj" className="block text-sm font-medium text-slate-700 mb-1">
                    CNPJ (opcional)
                  </label>
                  <Input
                    id="cnpj"
                    name="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    defaultValue={state.payload.cnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                    aria-invalid={!!state.fieldErrors.cnpj}
                  />
                  {state.fieldErrors.cnpj && (
                    <p className="mt-1 text-sm text-red-500">{state.fieldErrors.cnpj}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">
                    Nome da empresa
                  </label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder="Minha Empresa Ltda"
                    defaultValue={state.payload.companyName}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                    aria-invalid={!!state.fieldErrors.companyName}
                  />
                  {state.fieldErrors.companyName && (
                    <p className="mt-1 text-sm text-red-500">{state.fieldErrors.companyName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                    Senha
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    defaultValue={state.payload.password}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                    aria-invalid={!!state.fieldErrors.password}
                  />
                  {state.fieldErrors.password && (
                    <p className="mt-1 text-sm text-red-500">{state.fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                    Confirmar senha
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repita a senha"
                    defaultValue={state.payload.confirmPassword}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                    aria-invalid={!!state.fieldErrors.confirmPassword}
                  />
                  {state.fieldErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{state.fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {state.message && (
                <p className="text-red-500 text-sm text-center p-2 bg-red-50 rounded-lg">{state.message}</p>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  title={isPending ? "Criando conta..." : "Criar conta grátis"}
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none uppercase tracking-widest text-xs cursor-pointer"
                />
                <Link
                  to="/login"
                  className="text-center text-slate-600 hover:text-emerald-500 text-sm transition-colors"
                >
                  Já tem conta? Fazer login
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
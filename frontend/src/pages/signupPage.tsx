import { useActionState } from "react";
import { API_URL } from "../utils/api"
import { z } from "zod";

import { Input } from "../components/Input";
import { Button } from "../components/Button";

import logo from "../assets/logo.png"

export function SignupPage() {

  const [state, formAction, isDisabled] = useActionState(handleSubmit, {
    message: "",
    payload: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    }
  });

  async function handleSubmit(_: any, formData: FormData) {

    const bodySchema = z.object({
      name: z.string().min(3, "O nome deve conter no mínimo 3 caracteres"),
      email: z.email("Email inválido"),
      password: z.string().min(6, "A senha deve conter no mínimo 6 caracteres"),
      confirmPassword: z.string(),
    })

    const payload = bodySchema.parse({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    })

    try {

      if (payload.password !== payload.confirmPassword) {
        return { message: "Senhas não coincidem", payload }
      }

      const response = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        return { message: "Erro ao cadastrar, tente novamente em alguns segundos!", payload }
      }

      const data = await response.json();

      window.localStorage.setItem("@viggo:user", JSON.stringify(data.user));
      window.localStorage.setItem("@viggo:token", JSON.stringify(data.token));

      alert("Cadastro realizado com sucesso!");

      window.location.href = "/";

    } catch (error) {
      return { message: "Erro ao cadastrar, tente novamente em alguns segundos!", payload }
    }

  }

  return (
    <div className="flex-1 flex items-center justify-center w-full h-full px-2 py-2">
      {/* Card de Cadastro */}
      <div className="flex flex-col md:flex-row w-full max-w-5xl rounded-r-2xl shadow-2xl overflow-hidden min-h-[500px] md:h-[600px]">

        {/* LADO ESQUERDO / TOPO MOBILE: Branding */}
        <section className="flex flex-col items-center justify-center bg-emerald-400 w-full md:w-1/2 h-1/3 md:h-full p-8 transition-all duration-500 md:rounded-l-2xl md:rounded-t-none rounded-t-2xl">
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-left duration-700">
            <img
              src={logo}
              alt="Viggo Logo"
              className="w-32 md:w-56 h-auto drop-shadow-xl"
            />
          </div>
        </section>

        {/* LADO DIREITO / BAIXO MOBILE: Form de Cadastro */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 border-emerald-400 border-2 md:rounded-r-2xl md:rounded-b-none rounded-b-2xl">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right duration-700">

            {/* Título do Form */}
            <header className="text-center md:text-left">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                Crie sua conta no <span className="text-emerald-500">Viggo</span>
              </h1>
            </header>

            <form action={formAction} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <Input
                    name="name"
                    type="text"
                    placeholder="Seu nome"
                    defaultValue={state?.payload.name}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                </div>

                <div className="relative group">
                  <Input
                    name="email"
                    type="email"
                    placeholder="Seu e-mail"
                    defaultValue={state?.payload.email}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                </div>

                <div className="relative group">
                  <Input
                    name="password"
                    type="password"
                    placeholder="Sua senha"
                    defaultValue={state?.payload.password}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                </div>

                <div className="relative group">
                  <Input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirme sua senha"
                    defaultValue={state?.payload.confirmPassword}
                    className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                  />
                </div>
              </div>

              {state?.message && (
                <p className="text-red-500 text-sm text-center p-2 bg-red-50 rounded-lg">
                  {state.message}
                </p>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  title={isDisabled ? "Criando..." : "Criar conta"}
                  type="submit"
                  disabled={isDisabled}
                  className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none uppercase tracking-widest text-xs cursor-pointer"
                />
                <a href="/" className="text-center text-slate-600 hover:text-emerald-500 text-sm transition-colors">
                  Já tem uma conta? Entre aqui
                </a>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
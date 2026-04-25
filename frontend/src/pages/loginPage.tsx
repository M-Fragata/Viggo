import { useActionState } from "react";
import { z } from "zod";

import { API_URL } from "../utils/api"

import { Input } from "../components/Input";
import { Button } from "../components/Button";

import logo from "../assets/logo.png"

export function LoginPage() {

  const [state, formAction, isDisabled] = useActionState(handleSubmit, {
    message: "",
    payload: {
      email: "",
      password: "",
    }
  });

  async function handleSubmit(_: any, formData: FormData) {

    const bodySchema = z.object({
      email: z.email("Email inválido"),
      password: z.string().min(6, "A senha deve conter no mínimo 6 caracteres"),
    })

    const payload = bodySchema.parse({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    try {

      const response = await fetch(`${API_URL}/sessions/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        return { message: "Erro ao fazer login, tente novamente em alguns segundos!", payload }
      }

      const data = await response.json();

      window.localStorage.setItem("@viggo:user", JSON.stringify(data.user));
      window.localStorage.setItem("@viggo:token", JSON.stringify(data.token));

      window.location.href = "/";

    } catch (error) {
      return { message: "Erro ao fazer login, tente novamente em alguns segundos!", payload }
    }

  }

  return (
    <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2">
      {/* Card de Login */}
      <div className="flex flex-col md:flex-row w-full max-w-5xl rounded-l-2xl shadow-2xl min-h-[500px] md:h-[600px]">


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

        {/* LADO DIREITO / BAIXO MOBILE: Form de Login */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 border-emerald-400 border-2 md:rounded-r-2xl md:rounded-b-none rounded-b-2xl">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right duration-700">

            {/* Título do Form */}
            <header className="text-center md:text-left">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                Bem-vindo ao <span className="text-emerald-500">Viggo</span>
              </h1>
            </header>

            <form action={formAction} className="space-y-6">
              <div className="space-y-4">
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
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  title={isDisabled ? "Entrando..." : "Entrar"}
                  type="submit"
                  disabled={isDisabled}
                  className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none uppercase tracking-widest text-xs cursor-pointer"
                />
                <a href="/signup">Criar conta</a>
              </div>
            </form>
          </div>
        </main >
      </div >
    </div>
  );
}
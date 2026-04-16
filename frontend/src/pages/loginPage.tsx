import { useActionState } from "react";
import {z} from "zod";

import { Input } from "../components/Input";
import { Button } from "../components/Button";

export function LoginPage() {

  const [state, formAction, isDisabled] = useActionState(handleSubmit, {
    message: null,
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
    
      const response = await fetch("http://localhost:3333/sessions/login",{
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if(!response.ok){
        return { message: "Erro ao fazer login, tente novamente em alguns segundos!", payload }
      }

    } catch (error) {
      return { message: "Erro ao fazer login, tente novamente em alguns segundos!", payload }
    }

   }

  return (
    <div className="flex items-center justify-center h-screen">
      <header>
        <h1 className="text-4xl font-bold">Login Page</h1>
      </header>
      <main>
        <form action={formAction}>
          <div>
            <Input
              name="email"
              type="email"
              placeholder="Email"
              defaultValue={state?.payload.email}
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              defaultValue={state?.payload.password}
            />

          </div>
          <div>
            <Button
              title={isDisabled ? "Entrando..." : "Entrar"}
              type="submit"
              disabled={isDisabled}
            />
          </div>
        </form>
      </main>
    </div>
  )
}
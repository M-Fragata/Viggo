import { useActionState } from "react";
import {z} from "zod";

import { Input } from "../components/Input";
import { Button } from "../components/Button";

export function SignupPage() {

  const [state, formAction, isDisabled] = useActionState(handleSubmit, {
    message: null,
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
        return { message: "Senhas diferentes", payload }
      }

      const response = await fetch("http://localhost:3333/sessions",{
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      console.log(response)

      if(!response.ok){
        return { message: "Erro ao cadastrar, tente novamente em alguns segundos!", payload }
      }

      alert(`Name: ${payload.name}\nEmail: ${payload.email}\nPassword: ${payload.password}`);

    } catch (error) {
      return { message: "Erro ao cadastrar, tente novamente em alguns segundos!", payload }
    }

  }

  return (

    <div className="flex items-center justify-center h-screen">
      <header>
        <h1 className="text-4xl font-bold">Signup Page</h1>
      </header>
      <main>
        <form action={formAction}>
          <div>
            <Input
              placeholder="name"
              name="name"
              defaultValue={state?.payload.name}
            />
            <Input
              placeholder="email"
              name="email"
              type="email"
              defaultValue={state?.payload.email}

            />
            <Input
              placeholder="password"
              name="password"
              type="password"
              defaultValue={state?.payload.password}
            />
            <Input
              placeholder="confirm password"
              name="confirmPassword"
              type="password"
              defaultValue={state?.payload.confirmPassword}
            />

            <p className="text-red-500 text-sm m-auto">{state?.message}</p>

          </div>
          <div>
            <Button
              title={isDisabled ? "Criando..." : "Criar conta"}
              type="submit"
              disabled={isDisabled}
            />
          </div>
        </form>
      </main>
    </div>
  )
}
import { useActionState } from "react";

import { Input } from "../components/Input";
import { Button } from "../components/Button";

export function LoginPage() {

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

    const payload = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    }

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
        <h1 className="text-4xl font-bold">Login Page</h1>
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
import { useActionState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../services/api";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { CUSTOM_PLAN_CTA } from "../../../shared/plans";

interface CustomPlanFormData {
  name: string;
  email: string;
  companyName: string;
  estimatedEmployees: string;
  message: string;
}

export function CustomPlanPage() {
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(handleSubmit, {
    message: "",
    fieldErrors: {},
    payload: {
      name: "",
      email: "",
      companyName: "",
      estimatedEmployees: "",
      message: "",
    },
  });

  async function handleSubmit(_prevState: unknown, formData: FormData) {
    const rawData: CustomPlanFormData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      companyName: formData.get("companyName") as string,
      estimatedEmployees: formData.get("estimatedEmployees") as string,
      message: formData.get("message") as string,
    };

    const fieldErrors: Record<string, string> = {};

    if (!rawData.name.trim() || rawData.name.length < 3) {
      fieldErrors.name = "Nome deve ter no mínimo 3 caracteres";
    }

    if (!rawData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawData.email)) {
      fieldErrors.email = "Email inválido";
    }

    if (!rawData.companyName.trim() || rawData.companyName.length < 2) {
      fieldErrors.companyName = "Nome da empresa inválido";
    }

    if (!rawData.estimatedEmployees.trim()) {
      fieldErrors.estimatedEmployees = "Informe a estimativa de funcionários";
    } else {
      const num = parseInt(rawData.estimatedEmployees, 10);
      if (isNaN(num) || num < 1) {
        fieldErrors.estimatedEmployees = "Número inválido";
      }
    }

    if (!rawData.message.trim() || rawData.message.length < 10) {
      fieldErrors.message = "Mensagem deve ter no mínimo 10 caracteres";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { message: "", fieldErrors, payload: rawData };
    }

    try {
      await api.company.public.getInviteByToken("dummy"); // placeholder para usar a api
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3333"}/master/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Erro ao enviar solicitação" }));
        throw new Error(error.message);
      }

      navigate("/planos/custom?success=true");
    } catch (error) {
      const err = error as Error;
      return { message: err.message || "Erro ao enviar. Tente novamente.", fieldErrors: {}, payload: rawData };
    }

    return { message: "", fieldErrors: {}, payload: rawData };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const isSuccess = searchParams.get("success") === "true";

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2">
        <div className="w-full max-w-7xl text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Solicitação enviada!</h1>
          <p className="mt-4 text-slate-600">
            Nossa equipe comercial entrará em contato em até 24h úteis para
            entender suas necessidades e apresentar a melhor proposta.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-dvw h-dvh px-2 py-2">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Plano Personalizado</h1>
          <p className="mt-3 text-lg text-slate-600">
            Preencha o formulário e nossa equipe entrará em contato para entender
            suas necessidades e montar a proposta ideal.
          </p>
        </header>

        <form action={formAction} className="space-y-6 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
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
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                E-mail corporativo
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
              <label htmlFor="estimatedEmployees" className="block text-sm font-medium text-slate-700 mb-1">
                Estimativa de funcionários
              </label>
              <Input
                id="estimatedEmployees"
                name="estimatedEmployees"
                type="number"
                placeholder="Ex: 500"
                defaultValue={state.payload.estimatedEmployees}
                min="1"
                className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all"
                aria-invalid={!!state.fieldErrors.estimatedEmployees}
              />
              {state.fieldErrors.estimatedEmployees && (
                <p className="mt-1 text-sm text-red-500">{state.fieldErrors.estimatedEmployees}</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                Conte-nos sua necessidade
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Descreva suas necessidades: número de unidades, integrações desejadas (ERP, RH, folha), compliance específico, SSO, on-premise, etc."
                defaultValue={state.payload.message}
                className="w-full pl-4 pr-4 py-3 border-2 border-slate-100 focus:border-emerald-400 rounded-2xl outline-none transition-all resize-y min-h-[120px]"
                aria-invalid={!!state.fieldErrors.message}
              />
              {state.fieldErrors.message && (
                <p className="mt-1 text-sm text-red-500">{state.fieldErrors.message}</p>
              )}
            </div>
          </div>

          {state.message && (
            <p className="text-red-500 text-sm text-center p-3 bg-red-50 rounded-lg" role="alert">
              {state.message}
            </p>
          )}

          <div className="pt-4">
            <Button
              title={isPending ? "Enviando..." : CUSTOM_PLAN_CTA}
              type="submit"
              disabled={isPending}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none uppercase tracking-widest text-xs cursor-pointer"
            />
          </div>

          <p className="text-center text-sm text-slate-500">
            Ou inicie agora com nosso <Link to="/company/signup" className="text-emerald-600 hover:underline font-medium">trial gratuito de 30 dias</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
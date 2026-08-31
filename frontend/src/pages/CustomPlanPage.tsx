import { useActionState } from "react";
import { Link, useNavigate } from "react-router";
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

interface FormState {
  message: string;
  fieldErrors: Partial<Record<keyof CustomPlanFormData, string>>;
  payload: CustomPlanFormData;
}

const initialFormState: FormState = {
  message: "",
  fieldErrors: {},
  payload: {
    name: "",
    email: "",
    companyName: "",
    estimatedEmployees: "",
    message: "",
  },
};

export function CustomPlanPage() {
  const navigate = useNavigate();

  async function handleSubmit(_prevState: FormState, formData: FormData): Promise<FormState> {
    const rawData: CustomPlanFormData = {
      name: (formData.get("name") as string) || "",
      email: (formData.get("email") as string) || "",
      companyName: (formData.get("companyName") as string) || "",
      estimatedEmployees: (formData.get("estimatedEmployees") as string) || "",
      message: (formData.get("message") as string) || "",
    };

    const fieldErrors: Partial<Record<keyof CustomPlanFormData, string>> = {};

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

  const [state, formAction, isPending] = useActionState(handleSubmit, initialFormState);

  const searchParams = new URLSearchParams(window.location.search);
  const isSuccess = searchParams.get("success") === "true";

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-dvh w-full px-4 py-8 bg-slate-50 dark:bg-black transition-colors duration-200">
        <div className="w-full text-center bg-white dark:bg-[#121214] border border-slate-200 dark:border-white/10 rounded-2xl p-8 md:p-10 shadow-xl">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Solicitação enviada!</h1>
          <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
            Nossa equipe comercial entrará em contato em até 24h úteis para
            entender suas necessidades e apresentar a melhor proposta.
          </p>
          <div className="mt-8">
            <Link
              to="/page"
              className="inline-flex items-center justify-center rounded-full bg-brand-green px-8 py-3.5 text-sm font-semibold text-black hover:bg-brand-green-deep transition-all shadow-md shadow-brand-green/20"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-dvh w-full px-4 py-12 bg-slate-50 dark:bg-black transition-colors duration-200">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <Link to="/page" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-brand-green mb-6 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar ao site</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Plano Personalizado</h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            Preencha o formulário e nossa equipe entrará em contato para entender
            suas necessidades e montar a proposta ideal.
          </p>
        </header>

        <form action={formAction} className="space-y-6 bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-white/10 p-8 shadow-xl dark:shadow-2xl">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-on-dark-muted mb-1.5">
                Seu nome completo
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="João da Silva"
                defaultValue={state.payload.name}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-on-dark border border-slate-200 dark:border-white/10 focus:border-brand-green rounded-xl outline-none transition-all"
                aria-invalid={!!state.fieldErrors.name}
              />
              {state.fieldErrors.name && (
                <p className="mt-1 text-xs text-red-500">{state.fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-on-dark-muted mb-1.5">
                E-mail corporativo
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="joao@empresa.com"
                defaultValue={state.payload.email}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-on-dark border border-slate-200 dark:border-white/10 focus:border-brand-green rounded-xl outline-none transition-all"
                aria-invalid={!!state.fieldErrors.email}
              />
              {state.fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="companyName" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-on-dark-muted mb-1.5">
                Nome da empresa
              </label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Minha Empresa Ltda"
                defaultValue={state.payload.companyName}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-on-dark border border-slate-200 dark:border-white/10 focus:border-brand-green rounded-xl outline-none transition-all"
                aria-invalid={!!state.fieldErrors.companyName}
              />
              {state.fieldErrors.companyName && (
                <p className="mt-1 text-xs text-red-500">{state.fieldErrors.companyName}</p>
              )}
            </div>

            <div>
              <label htmlFor="estimatedEmployees" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-on-dark-muted mb-1.5">
                Estimativa de funcionários
              </label>
              <Input
                id="estimatedEmployees"
                name="estimatedEmployees"
                type="number"
                placeholder="Ex: 500"
                defaultValue={state.payload.estimatedEmployees}
                min="1"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-on-dark border border-slate-200 dark:border-white/10 focus:border-brand-green rounded-xl outline-none transition-all"
                aria-invalid={!!state.fieldErrors.estimatedEmployees}
              />
              {state.fieldErrors.estimatedEmployees && (
                <p className="mt-1 text-xs text-red-500">{state.fieldErrors.estimatedEmployees}</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-on-dark-muted mb-1.5">
                Mensagem (opcional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Conte um pouco sobre as necessidades da sua empresa..."
                defaultValue={state.payload.message}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-on-dark border border-slate-200 dark:border-white/10 focus:border-brand-green rounded-xl outline-none transition-all text-sm resize-none"
              />
            </div>
          </div>

          {state.message && (
            <p className="text-red-500 text-sm text-center p-3 bg-red-50 dark:bg-red-500/10 rounded-xl" role="alert">
              {state.message}
            </p>
          )}

          <div className="pt-2">
            <Button
              title={isPending ? "Enviando..." : CUSTOM_PLAN_CTA}
              type="submit"
              disabled={isPending}
              className="w-full bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full uppercase tracking-wider text-xs shadow-lg shadow-brand-green/20"
            />
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Ou inicie agora com nosso <Link to="/company/signup" className="text-brand-green hover:underline font-semibold">trial gratuito de 30 dias</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
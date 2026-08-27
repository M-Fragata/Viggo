import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  FileText,
  Building,
  Building2,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { StepIndicator, type StepItem } from "../components/auth/StepIndicator";
import { PasswordStrengthIndicator } from "../components/auth/PasswordStrengthIndicator";
import { lookupCnpj } from "../utils/cnpjLookup";
import {
  formatCpf,
  formatCnpj,
  validateCpf,
  validateCnpj,
  companySignupSchema,
} from "../schemas/companySignup";
import { trackEvent } from "../utils/metrics";

const STEPS: StepItem[] = [
  { id: 1, title: "Responsável", shortTitle: "Responsável" },
  { id: 2, title: "Empresa", shortTitle: "Empresa" },
  { id: 3, title: "Segurança", shortTitle: "Segurança" },
];

export function CompanySignupPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    trackEvent("signup_view", { path: "/company/signup" });
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    cnpj: "",
    companyName: "",
    password: "",
    confirmPassword: "",
    aceiteContratos: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [cnpjSuccessMessage, setCnpjSuccessMessage] = useState("");

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    updateField("cpf", formatted);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    updateField("cnpj", formatted);
    setCnpjSuccessMessage("");

    const cleanCnpj = formatted.replace(/\D/g, "");
    if (cleanCnpj.length === 14 && validateCnpj(cleanCnpj)) {
      fetchCnpjData(cleanCnpj);
    }
  };

  const fetchCnpjData = async (cleanCnpj: string) => {
    try {
      setIsSearchingCnpj(true);
      const result = await lookupCnpj(cleanCnpj);

      if (result) {
        const nameToUse = result.nomeFantasia || result.razaoSocial;
        setFormData((prev) => ({ ...prev, companyName: nameToUse }));
        setCnpjSuccessMessage(result.razaoSocial || nameToUse);
        toast.success("Dados da empresa encontrados!");
      } else {
        toast.info(
          "CNPJ recente ou não localizado na base pública. Preencha o nome da empresa manualmente.",
          { duration: 4000 }
        );
      }
    } catch {
      // Ignora erro silenciosamente, permitindo preenchimento manual
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim() || formData.name.trim().length < 3) {
        stepErrors.name = "Nome deve ter no mínimo 3 caracteres";
      }
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        stepErrors.email = "Informe um e-mail válido";
      }
      const cleanCpf = formData.cpf.replace(/\D/g, "");
      if (!cleanCpf || cleanCpf.length !== 11 || !validateCpf(cleanCpf)) {
        stepErrors.cpf = "CPF inválido";
      }
    } else if (step === 2) {
      const cleanCnpj = formData.cnpj.replace(/\D/g, "");
      if (!cleanCnpj || cleanCnpj.length !== 14 || !validateCnpj(cleanCnpj)) {
        stepErrors.cnpj = "CNPJ inválido";
      }
      if (!formData.companyName.trim() || formData.companyName.trim().length < 2) {
        stepErrors.companyName = "Nome da empresa inválido";
      }
    } else if (step === 3) {
      if (!formData.password || formData.password.length < 8) {
        stepErrors.password = "Senha deve ter no mínimo 8 caracteres";
      }
      if (formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = "As senhas não conferem";
      }
      if (!formData.aceiteContratos) {
        stepErrors.aceiteContratos = "Você precisa aceitar os Termos e Política para continuar";
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    const parsed = companySignupSchema.safeParse({
      name: formData.name,
      email: formData.email,
      cpf: formData.cpf,
      cnpj: formData.cnpj,
      companyName: formData.companyName,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      aceiteContratos: formData.aceiteContratos,
    });

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
      const response = await api.auth.signup({
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf.replace(/\D/g, ""),
        cnpj: formData.cnpj.replace(/\D/g, ""),
        companyName: formData.companyName,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        aceiteContratos: formData.aceiteContratos,
      });

      toast.success("Empresa cadastrada com sucesso! Bem-vindo ao Viggo.");
      trackEvent("signup_success", { path: "/company/signup", companyId: response.company.id });
      setSession(response.user, response.token, response.company.name);
      navigate("/");
    } catch (error: unknown) {
      const err = error as Error;
      const msg = err?.message || "Erro ao criar empresa. Tente novamente.";
      if (msg.includes("Dados inválidos")) {
        try {
          const parsedErr = JSON.parse(msg.replace("Dados inválidos: ", ""));
          const fieldErrors: Record<string, string> = {};
          parsedErr.errors?.forEach((e: { path: string[]; message: string }) => {
            fieldErrors[e.path[0]] = e.message;
          });
          setErrors(fieldErrors);
        } catch {
          toast.error("Dados inválidos. Verifique os campos.");
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      side="left"
      showHeader={true}
      panelTitle="Bem-vindo de volta!"
      panelDescription="Já possui uma conta da empresa? Acesse o painel agora mesmo com suas credenciais."
      panelButton={{
        text: "ENTRAR",
        to: "/",
      }}
      formTitle="Criar Conta"
      formSubtitle="Trial de 30 dias grátis sem necessidade de cartão"
    >
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) setCurrentStep(step);
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: DADOS DO RESPONSÁVEL */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              <AuthInput
                name="name"
                type="text"
                placeholder="Seu nome completo"
                icon={User}
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                error={errors.name}
                autoComplete="name"
                autoFocus
              />

              <AuthInput
                name="email"
                type="email"
                placeholder="E-mail corporativo"
                icon={Mail}
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                error={errors.email}
                autoComplete="email"
              />

              <AuthInput
                name="cpf"
                type="text"
                placeholder="CPF (000.000.000-00)"
                icon={FileText}
                maxLength={14}
                value={formData.cpf}
                onChange={handleCpfChange}
                error={errors.cpf}
              />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full transition-all duration-200 shadow-lg shadow-brand-green/20 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs"
                >
                  <span>Continuar</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: DADOS DA EMPRESA */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              <div>
                <AuthInput
                  name="cnpj"
                  type="text"
                  placeholder="CNPJ (00.000.000/0000-00)"
                  icon={Building}
                  maxLength={18}
                  value={formData.cnpj}
                  onChange={handleCnpjChange}
                  error={errors.cnpj}
                  rightElement={
                    isSearchingCnpj ? (
                      <Loader2 className="w-4 h-4 text-brand-green animate-spin" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const clean = formData.cnpj.replace(/\D/g, "");
                          if (clean.length === 14) fetchCnpjData(clean);
                        }}
                        title="Buscar dados do CNPJ"
                        className="p-1 hover:text-brand-green transition-colors"
                      >
                        <Search className="w-4 h-4 text-stone" />
                      </button>
                    )
                  }
                  autoFocus
                />
                {cnpjSuccessMessage && (
                  <p className="mt-1 text-[11px] text-brand-green flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Razão Social: {cnpjSuccessMessage}</span>
                  </p>
                )}
              </div>

              <AuthInput
                name="companyName"
                type="text"
                placeholder="Nome da empresa / Razão Social"
                icon={Building2}
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                error={errors.companyName}
              />

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-on-dark font-medium py-3.5 px-5 rounded-full border border-slate-200 dark:border-white/10 transition-colors cursor-pointer text-xs uppercase tracking-wider"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full transition-all duration-200 shadow-lg shadow-brand-green/20 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs"
                >
                  <span>Continuar</span>
                  
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SEGURANÇA & TERMOS */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              <AuthInput
                name="password"
                isPassword
                placeholder="Criar senha (mínimo 8 caracteres)"
                icon={Lock}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                error={errors.password}
                autoComplete="new-password"
                autoFocus
              />

              <AuthInput
                name="confirmPassword"
                isPassword
                placeholder="Confirmar senha"
                icon={Lock}
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <PasswordStrengthIndicator
                password={formData.password}
                confirmPassword={formData.confirmPassword}
                showCriteria={false}
              />

              {/* Checkbox Termos */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    name="aceiteContratos"
                    checked={formData.aceiteContratos}
                    onChange={(e) => updateField("aceiteContratos", e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded bg-slate-100 dark:bg-white/[0.05] border-slate-300 dark:border-white/20 text-brand-green focus:ring-brand-green focus:ring-offset-white dark:focus:ring-offset-black accent-brand-green cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-on-dark-muted leading-tight group-hover:text-slate-900 dark:group-hover:text-on-dark transition-colors">
                    Li e concordo com os{" "}
                    <Link
                      to="/termos-de-uso"
                      target="_blank"
                      className="text-brand-green underline hover:text-brand-green-soft font-medium"
                    >
                      Termos de Uso
                    </Link>{" "}
                    e{" "}
                    <Link
                      to="/politica-privacidade"
                      target="_blank"
                      className="text-brand-green underline hover:text-brand-green-soft font-medium"
                    >
                      Privacidade (LGPD)
                    </Link>
                    .
                  </span>
                </label>
                {errors.aceiteContratos && (
                  <p className="mt-1 text-[11px] text-red-500 dark:text-red-400 pl-6">{errors.aceiteContratos}</p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-on-dark font-medium py-3.5 px-5 rounded-full border border-slate-200 dark:border-white/10 transition-colors cursor-pointer text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-6 rounded-full transition-all duration-200 shadow-lg shadow-brand-green/20 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Criando conta...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar conta</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </AuthLayout>
  );
}
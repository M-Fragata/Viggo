export const TRIAL_DAYS = 30;

export const CUSTOM_PLAN_CTA = "Falar com vendas";

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanData {
  id: "TIER_I" | "TIER_II" | "TIER_III" | "ENTERPRISE_CUSTOM";
  name: string;
  price: number | null;
  period: string;
  maxEmployees: number | null;
  features: PlanFeature[];
  highlighted: boolean;
  ctaText: string;
  ctaVariant: "primary" | "secondary" | "outline";
}

export const PLANS: readonly PlanData[] = [
  {
    id: "TIER_I",
    name: "Starter",
    price: 49.9,
    period: "/mês",
    maxEmployees: 10,
    features: [
      { text: "Até 10 funcionários", included: true },
      { text: "Reconhecimento facial ilimitado", included: true },
      { text: "Controle de localização (GPS)", included: true },
      { text: "Espelho de ponto e relatórios", included: true },
      { text: "Convites por link/QR code", included: true },
      { text: "Suporte por email", included: true },
      { text: "API pública", included: false },
      { text: "Integrações avançadas", included: false },
      { text: "SLA garantido", included: false },
    ],
    highlighted: false,
    ctaText: "Começar trial grátis",
    ctaVariant: "outline",
  },
  {
    id: "TIER_II",
    name: "Professional",
    price: 149.9,
    period: "/mês",
    maxEmployees: 50,
    features: [
      { text: "Até 50 funcionários", included: true },
      { text: "Reconhecimento facial ilimitado", included: true },
      { text: "Controle de localização (GPS)", included: true },
      { text: "Espelho de ponto e relatórios", included: true },
      { text: "Convites por link/QR code", included: true },
      { text: "Suporte prioritário (email + chat)", included: true },
      { text: "API pública (10k req/mês)", included: true },
      { text: "Integrações (Slack, Teams, Webhooks)", included: true },
      { text: "SLA 99.5%", included: true },
    ],
    highlighted: true,
    ctaText: "Começar trial grátis",
    ctaVariant: "primary",
  },
  {
    id: "TIER_III",
    name: "Enterprise",
    price: 349.9,
    period: "/mês",
    maxEmployees: 150,
    features: [
      { text: "Até 150 funcionários", included: true },
      { text: "Reconhecimento facial ilimitado", included: true },
      { text: "Controle de localização (GPS)", included: true },
      { text: "Espelho de ponto e relatórios avançados", included: true },
      { text: "Convites por link/QR code", included: true },
      { text: "Suporte 24/7 (telefone + chat + email)", included: true },
      { text: "API pública (100k req/mês)", included: true },
      { text: "Integrações completas + SSO (SAML/OIDC)", included: true },
      { text: "SLA 99.9% + contrato", included: true },
      { text: "Gerente de conta dedicado", included: true },
      { text: "Customizações de branding", included: true },
    ],
    highlighted: false,
    ctaText: "Começar trial grátis",
    ctaVariant: "outline",
  },
  {
    id: "ENTERPRISE_CUSTOM",
    name: "Personalizado",
    price: null,
    period: "",
    maxEmployees: null,
    features: [
      { text: "Funcionários ilimitados", included: true },
      { text: "Tudo do Enterprise", included: true },
      { text: "Desenvolvimento de features customizadas", included: true },
      { text: "Integração com sistemas legados", included: true },
      { text: "On-premise / Private cloud", included: true },
      { text: "Auditoria e compliance dedicados", included: true },
      { text: "Treinamento da equipe incluso", included: true },
      { text: "Contrato e negociação personalizados", included: true },
    ],
    highlighted: false,
    ctaText: "Falar com vendas",
    ctaVariant: "secondary",
  },
] as const;

export function getPlanById(id: PlanData["id"]): PlanData | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getHighlightedPlan(): PlanData | undefined {
  return PLANS.find((p) => p.highlighted);
}

export function formatPrice(price: number | null): string {
  if (price === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price);
}

export function formatMaxEmployees(max: number | null): string {
  if (max === null) return "Ilimitado";
  return `Até ${max} funcionários`;
}
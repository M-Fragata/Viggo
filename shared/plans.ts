export const TRIAL_DAYS = 30;

export const CUSTOM_PLAN_CTA = "Falar com vendas";

export const PRICING = {
  BASE_PRICE: 54.90,
  BASE_MAX_EMPLOYEES: 10,
  EXTRA_PRICE_PER_EMPLOYEE: 5.00,
} as const;

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanData {
  id: "DYNAMIC" | "ENTERPRISE_CUSTOM";
  name: string;
  price: number | null;
  period: string;
  maxEmployees: number | null;
  features: PlanFeature[];
  highlighted: boolean;
  ctaText: string;
  ctaVariant: "primary" | "secondary" | "outline";
}

export const DYNAMIC_PLAN: PlanData = {
  id: "DYNAMIC",
  name: "Padrão",
  price: PRICING.BASE_PRICE,
  period: "/mês",
  maxEmployees: 10,
  features: [
    { text: "Até 10 funcionários incluídos", included: true },
    { text: "+R$ 5,00 por funcionário extra", included: true },
    { text: "Reconhecimento facial", included: true },
    { text: "Controle de localização (GPS)", included: true },
    { text: "Espelho de ponto e relatórios", included: true },
    { text: "Suporte por Email e Whatsapp", included: true },
  ],
  highlighted: true,
  ctaText: "Iniciar grátis",
  ctaVariant: "primary",
};

export const ENTERPRISE_PLAN: PlanData = {
  id: "ENTERPRISE_CUSTOM",
  name: "Enterprise",
  price: null,
  period: "",
  maxEmployees: null,
  features: [
    { text: "Acima de 50 funcionários", included: true },
    { text: "Plano personalizado", included: true },
    { text: "Tudo do plano Padrão", included: true },
  ],
  highlighted: false,
  ctaText: CUSTOM_PLAN_CTA,
  ctaVariant: "secondary",
};

export const PLANS = [DYNAMIC_PLAN, ENTERPRISE_PLAN] as const;

export function getPlanById(id: PlanData["id"]): PlanData | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getHighlightedPlan(): PlanData | undefined {
  return PLANS.find((p) => p.highlighted);
}

/**
 * Calcula o preço do plano dinâmico baseado no total de funcionários.
 * Desconta 1 do total para excluir o ENTERPRISE_ADMIN.
 *
 * @param totalUsers - Total de usuários na empresa (incluindo admin)
 * @returns Preço total do plano para o ciclo
 */
export function calculatePrice(totalUsers: number): number {
  const paidEmployees = Math.max(0, totalUsers - 1);
  const extras = Math.max(0, paidEmployees - PRICING.BASE_MAX_EMPLOYEES);
  return Math.round((PRICING.BASE_PRICE + extras * PRICING.EXTRA_PRICE_PER_EMPLOYEE) * 100) / 100;
}

/**
 * Calcula o preço do plano dinâmico com detalhes completos.
 *
 * @param totalUsers - Total de usuários na empresa (incluindo admin)
 * @returns Objeto com detalhes do cálculo
 */
export function calculateDynamicPrice(totalUsers: number) {
  const paidEmployees = Math.max(0, totalUsers - 1);
  const extraEmployees = Math.max(0, paidEmployees - PRICING.BASE_MAX_EMPLOYEES);
  const basePrice = PRICING.BASE_PRICE;
  const extraTotal = extraEmployees * PRICING.EXTRA_PRICE_PER_EMPLOYEE;
  const total = basePrice + extraTotal;

  return {
    basePrice,
    baseMaxEmployees: PRICING.BASE_MAX_EMPLOYEES,
    paidEmployees,
    extraEmployees,
    extraPricePerUnit: PRICING.EXTRA_PRICE_PER_EMPLOYEE,
    extraTotal,
    total: Math.round(total * 100) / 100,
  };
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
  if (max === null) return "Plano personalizado";
  return `Até ${max} funcionários`;
}

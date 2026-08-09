export const PRICING = {
  BASE_PRICE: 54.90,
  BASE_MAX_EMPLOYEES: 10,
  EXTRA_PRICE_PER_EMPLOYEE: 5.00,
} as const;

export interface DynamicPriceResult {
  basePrice: number;
  baseMaxEmployees: number;
  paidEmployees: number;
  extraEmployees: number;
  extraPricePerUnit: number;
  extraTotal: number;
  total: number;
}

/**
 * Calcula o preço do plano dinâmico baseado no total de funcionários.
 * Desconta 1 do total para excluir o ENTERPRISE_ADMIN.
 *
 * @param totalUsers - Total de usuários na empresa (incluindo admin)
 * @returns Objeto com detalhes do cálculo
 */
export function calculateDynamicPrice(totalUsers: number): DynamicPriceResult {
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

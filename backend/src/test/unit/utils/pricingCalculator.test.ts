import { describe, it, expect } from "vitest";
import {
  calculateDynamicPrice,
  PRICING,
} from "../../../utils/pricingCalculator.js";

describe("pricingCalculator", () => {
  describe("calculateDynamicPrice", () => {
    it("deve calcular preço base para 10 usuários (1 admin + 9 funcionários)", () => {
      const result = calculateDynamicPrice(10);

      expect(result.basePrice).toBe(PRICING.BASE_PRICE);
      expect(result.paidEmployees).toBe(9); // 10 - 1 (admin)
      expect(result.extraEmployees).toBe(0); // 9 <= 10 (BASE_MAX_EMPLOYEES)
      expect(result.extraTotal).toBe(0);
      expect(result.total).toBe(PRICING.BASE_PRICE);
    });

    it("deve calcular preço com funcionários extras", () => {
      const result = calculateDynamicPrice(15);

      expect(result.basePrice).toBe(PRICING.BASE_PRICE);
      expect(result.paidEmployees).toBe(14); // 15 - 1
      expect(result.extraEmployees).toBe(4); // 14 - 10 = 4
      expect(result.extraPricePerUnit).toBe(PRICING.EXTRA_PRICE_PER_EMPLOYEE);
      expect(result.extraTotal).toBe(20); // 4 * 5.00
      expect(result.total).toBe(74.90); // 54.90 + 20.00
    });

    it("deve calcular preço para 11 usuários (1 extra)", () => {
      const result = calculateDynamicPrice(11);

      expect(result.paidEmployees).toBe(10);
      expect(result.extraEmployees).toBe(0); // 10 <= 10
      expect(result.extraTotal).toBe(0);
      expect(result.total).toBe(PRICING.BASE_PRICE);
    });

    it("deve calcular preço para 12 usuários (2 extras)", () => {
      const result = calculateDynamicPrice(12);

      expect(result.paidEmployees).toBe(11);
      expect(result.extraEmployees).toBe(1);
      expect(result.extraTotal).toBe(5);
      expect(result.total).toBe(59.90);
    });

    it("deve tratar 1 usuário (só admin)", () => {
      const result = calculateDynamicPrice(1);

      expect(result.paidEmployees).toBe(0);
      expect(result.extraEmployees).toBe(0);
      expect(result.total).toBe(PRICING.BASE_PRICE);
    });

    it("deve tratar 0 funcionários (Math.max evita negativo)", () => {
      const result = calculateDynamicPrice(0);

      expect(result.paidEmployees).toBe(0);
      expect(result.extraEmployees).toBe(0);
      expect(result.total).toBe(PRICING.BASE_PRICE);
    });

    it("deve arredondar total para 2 casas decimais", () => {
      // 3 extras: 3 * 5.00 = 15.00 → total = 69.90
      const result = calculateDynamicPrice(14);
      expect(result.total).toBe(69.90);
    });
  });

  describe("PRICING constants", () => {
    it("deve ter BASE_PRICE = 54.90", () => {
      expect(PRICING.BASE_PRICE).toBe(54.90);
    });

    it("deve ter BASE_MAX_EMPLOYEES = 10", () => {
      expect(PRICING.BASE_MAX_EMPLOYEES).toBe(10);
    });

    it("deve ter EXTRA_PRICE_PER_EMPLOYEE = 5.00", () => {
      expect(PRICING.EXTRA_PRICE_PER_EMPLOYEE).toBe(5.00);
    });
  });
});

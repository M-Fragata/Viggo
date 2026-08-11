import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPlanLimits,
  canCreateEmployee,
  isTrialExpired,
  getTrialDaysRemaining,
  TRIAL_DAYS,
  DEFAULT_PLAN,
  DEFAULT_MAX_EMPLOYEES,
  PlanTier,
  CompanyStatus,
  UserRole,
} from "../../../utils/planLimits.js";

describe("planLimits", () => {
  describe("getPlanLimits", () => {
    it("deve retornar limites para DYNAMIC", () => {
      const limits = getPlanLimits(PlanTier.DYNAMIC);

      expect(limits.maxEmployees).toBeNull();
      expect(limits.price).toBe(54.90);
      expect(limits.api.general).toBe(100);
      expect(limits.api.checkin).toBe(10);
      expect(limits.api.faceValidation).toBe(30);
    });

    it("deve retornar limites para ENTERPRISE_CUSTOM", () => {
      const limits = getPlanLimits(PlanTier.ENTERPRISE_CUSTOM);

      expect(limits.maxEmployees).toBeNull();
      expect(limits.price).toBeNull();
      expect(limits.api.general).toBe(1000);
      expect(limits.api.checkin).toBe(100);
      expect(limits.api.faceValidation).toBe(200);
    });

    it("deve retornar limites DYNAMIC para plano desconhecido", () => {
      const limits = getPlanLimits("UNKNOWN" as PlanTier);
      expect(limits.price).toBe(54.90);
    });
  });

  describe("canCreateEmployee", () => {
    it("deve sempre retornar true (modelo dinâmico)", () => {
      expect(canCreateEmployee(PlanTier.DYNAMIC, 0)).toBe(true);
      expect(canCreateEmployee(PlanTier.DYNAMIC, 100)).toBe(true);
      expect(canCreateEmployee(PlanTier.ENTERPRISE_CUSTOM, 50)).toBe(true);
    });
  });

  describe("isTrialExpired", () => {
    it("deve retornar true para trial expirado", () => {
      const pastDate = new Date("2026-01-01");
      expect(isTrialExpired(pastDate)).toBe(true);
    });

    it("deve retornar false para trial futuro", () => {
      const futureDate = new Date("2099-12-31");
      expect(isTrialExpired(futureDate)).toBe(false);
    });

    it("deve retornar false para null", () => {
      expect(isTrialExpired(null)).toBe(false);
    });
  });

  describe("getTrialDaysRemaining", () => {
    it("deve retornar dias restantes positivos", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const remaining = getTrialDaysRemaining(futureDate);
      expect(remaining).toBeGreaterThanOrEqual(14);
      expect(remaining).toBeLessThanOrEqual(15);
    });

    it("deve retornar 0 para trial expirado", () => {
      const pastDate = new Date("2026-01-01");
      expect(getTrialDaysRemaining(pastDate)).toBe(0);
    });

    it("deve retornar 0 para null", () => {
      expect(getTrialDaysRemaining(null)).toBe(0);
    });

    it("deve retornar 1 para trial que expira amanhã", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const remaining = getTrialDaysRemaining(tomorrow);
      expect(remaining).toBe(1);
    });
  });

  describe("constants", () => {
    it("TRIAL_DAYS deve ser 30", () => {
      expect(TRIAL_DAYS).toBe(30);
    });

    it("DEFAULT_PLAN deve ser DYNAMIC", () => {
      expect(DEFAULT_PLAN).toBe(PlanTier.DYNAMIC);
    });

    it("DEFAULT_MAX_EMPLOYEES deve ser 10", () => {
      expect(DEFAULT_MAX_EMPLOYEES).toBe(10);
    });
  });

  describe("enums", () => {
    it("PlanTier deve ter valores corretos", () => {
      expect(PlanTier.DYNAMIC).toBe("DYNAMIC");
      expect(PlanTier.ENTERPRISE_CUSTOM).toBe("ENTERPRISE_CUSTOM");
    });

    it("CompanyStatus deve ter valores corretos", () => {
      expect(CompanyStatus.TRIAL).toBe("TRIAL");
      expect(CompanyStatus.ACTIVE).toBe("ACTIVE");
      expect(CompanyStatus.SUSPENDED).toBe("SUSPENDED");
      expect(CompanyStatus.CANCELLED).toBe("CANCELLED");
    });

    it("UserRole deve ter valores corretos", () => {
      expect(UserRole.MASTER).toBe("MASTER");
      expect(UserRole.ENTERPRISE_ADMIN).toBe("ENTERPRISE_ADMIN");
      expect(UserRole.EMPLOYEE).toBe("EMPLOYEE");
    });
  });
});

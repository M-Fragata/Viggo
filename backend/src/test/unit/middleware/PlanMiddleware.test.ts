import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    company: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../utils/pricingCalculator.js", () => ({
  calculateDynamicPrice: vi.fn().mockReturnValue({
    basePrice: 54.9,
    extraEmployees: 0,
    extraPrice: 0,
    total: 54.9,
  }),
}));

import {
  getCompanyPlanInfo,
  requireActivePlan,
  requireEmployeeLimit,
  planMiddleware,
  createDynamicRateLimiter,
} from "../../../middleware/PlanMiddleware.js";
import { prisma } from "../../../database/prisma.js";
import { PlanTier, CompanyStatus } from "../../../utils/planLimits.js";

describe("PlanMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  describe("getCompanyPlanInfo", () => {
    it("deve retornar informações do plano da empresa", async () => {
      (prisma.company.findUnique as any).mockResolvedValue({
        plan: "DYNAMIC",
        status: "ACTIVE",
        maxEmployees: 10,
        planExpiresAt: new Date("2027-12-31"),
        trialUsed: false,
        _count: { users: 5 },
      });

      const result = await getCompanyPlanInfo("company-1");

      expect(result).not.toBeNull();
      expect(result!.plan).toBe(PlanTier.DYNAMIC);
      expect(result!.status).toBe(CompanyStatus.ACTIVE);
      expect(result!.currentEmployees).toBe(5);
      expect(result!.isTrial).toBe(false);
    });

    it("deve retornar null quando empresa não encontrada", async () => {
      (prisma.company.findUnique as any).mockResolvedValue(null);

      const result = await getCompanyPlanInfo("nonexistent");

      expect(result).toBeNull();
    });

    it("deve identificar empresa em trial", async () => {
      (prisma.company.findUnique as any).mockResolvedValue({
        plan: "DYNAMIC",
        status: "TRIAL",
        maxEmployees: 10,
        planExpiresAt: new Date("2027-12-31"),
        trialUsed: false,
        _count: { users: 2 },
      });

      const result = await getCompanyPlanInfo("company-1");

      expect(result!.isTrial).toBe(true);
    });

    it("deve calcular trialDaysRemaining corretamente", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      (prisma.company.findUnique as any).mockResolvedValue({
        plan: "DYNAMIC",
        status: "TRIAL",
        maxEmployees: 10,
        planExpiresAt: futureDate,
        trialUsed: false,
        _count: { users: 1 },
      });

      const result = await getCompanyPlanInfo("company-1");

      expect(result!.trialDaysRemaining).toBeGreaterThanOrEqual(14);
      expect(result!.trialDaysRemaining).toBeLessThanOrEqual(15);
    });

    it("deve retornar 0 trialDaysRemaining quando trial expirado", async () => {
      (prisma.company.findUnique as any).mockResolvedValue({
        plan: "DYNAMIC",
        status: "TRIAL",
        maxEmployees: 10,
        planExpiresAt: new Date("2026-01-01"),
        trialUsed: false,
        _count: { users: 1 },
      });

      const result = await getCompanyPlanInfo("company-1");

      expect(result!.trialDaysRemaining).toBe(0);
    });
  });

  describe("requireActivePlan", () => {
    it("deve permitir empresa ativa", () => {
      const req = {
        planInfo: {
          status: CompanyStatus.ACTIVE,
          isTrial: false,
          trialDaysRemaining: 0,
        },
      };
      const res = mockRes();

      requireActivePlan(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("deve bloquear empresa suspensa", () => {
      const req = {
        planInfo: {
          status: CompanyStatus.SUSPENDED,
          isTrial: false,
          trialDaysRemaining: 0,
        },
      };
      const res = mockRes();

      requireActivePlan(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "COMPANY_SUSPENDED" })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve bloquear empresa cancelada", () => {
      const req = {
        planInfo: {
          status: CompanyStatus.CANCELLED,
          isTrial: false,
          trialDaysRemaining: 0,
        },
      };
      const res = mockRes();

      requireActivePlan(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "COMPANY_CANCELLED" })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve bloquear trial expirado", () => {
      const req = {
        planInfo: {
          status: CompanyStatus.TRIAL,
          isTrial: true,
          trialDaysRemaining: 0,
        },
      };
      const res = mockRes();

      requireActivePlan(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "TRIAL_EXPIRED" })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve permitir trial com dias restantes", () => {
      const req = {
        planInfo: {
          status: CompanyStatus.TRIAL,
          isTrial: true,
          trialDaysRemaining: 15,
        },
      };
      const res = mockRes();

      requireActivePlan(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear quando planInfo não existe", () => {
      const req = {};
      const res = mockRes();

      requireActivePlan(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireEmployeeLimit", () => {
    it("deve permitir para plano DYNAMIC", () => {
      const req = {
        planInfo: { plan: PlanTier.DYNAMIC },
      };
      const res = mockRes();

      requireEmployeeLimit(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve permitir para plano ENTERPRISE_CUSTOM", () => {
      const req = {
        planInfo: { plan: PlanTier.ENTERPRISE_CUSTOM },
      };
      const res = mockRes();

      requireEmployeeLimit(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear quando planInfo não existe", () => {
      const req = {};
      const res = mockRes();

      requireEmployeeLimit(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("planMiddleware", () => {
    it("deve adicionar planInfo ao req", async () => {
      (prisma.company.findUnique as any).mockResolvedValue({
        plan: "DYNAMIC",
        status: "ACTIVE",
        maxEmployees: 10,
        planExpiresAt: new Date("2027-12-31"),
        trialUsed: false,
        _count: { users: 5 },
      });

      const req = { user: { companyId: "company-1" } };
      const res = mockRes();

      await planMiddleware(req as any, res as any, mockNext);

      expect((req as any).planInfo).toBeDefined();
      expect((req as any).planInfo.plan).toBe(PlanTier.DYNAMIC);
      expect(mockNext).toHaveBeenCalled();
    });

    it("deve retornar 401 sem companyId", async () => {
      const req = { user: {} };
      const res = mockRes();

      await planMiddleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve retornar 403 quando empresa não encontrada", async () => {
      (prisma.company.findUnique as any).mockResolvedValue(null);

      const req = { user: { companyId: "nonexistent" } };
      const res = mockRes();

      await planMiddleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("createDynamicRateLimiter", () => {
    it("deve retornar limites para DYNAMIC", () => {
      const limits = createDynamicRateLimiter(PlanTier.DYNAMIC);

      expect(limits.general).toBe(100);
      expect(limits.checkin).toBe(10);
      expect(limits.faceValidation).toBe(30);
    });

    it("deve retornar limites para ENTERPRISE_CUSTOM", () => {
      const limits = createDynamicRateLimiter(PlanTier.ENTERPRISE_CUSTOM);

      expect(limits.general).toBe(1000);
      expect(limits.checkin).toBe(100);
      expect(limits.faceValidation).toBe(200);
    });
  });
});

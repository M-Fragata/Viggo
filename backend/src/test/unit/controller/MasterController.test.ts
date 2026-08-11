import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  company: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn(), groupBy: vi.fn() },
  user: { count: vi.fn(), findFirst: vi.fn() },
  checkIn: { count: vi.fn() },
  subscription: { findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../middleware/AuditMiddleware.js", () => ({
  createAuditLog: vi.fn(),
}));

import { MasterController } from "../../../controller/master/MasterController.js";

describe("MasterController", () => {
  let controller: MasterController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MasterController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe("listCompanies", () => {
    it("deve listar empresas com paginação", async () => {
      mockPrisma.company.findMany.mockResolvedValue([
        { id: "550e8400-e29b-41d4-a716-446655440001", name: "Empresa 1", cnpj: "11222333000181", plan: "DYNAMIC", status: "ACTIVE",
          planExpiresAt: null, maxEmployees: null, createdAt: new Date(),
          _count: { users: 5, checkIns: 100 } },
      ]);
      mockPrisma.company.count.mockResolvedValue(1);

      req = { query: { page: "1", limit: "20" } };

      await controller.listCompanies(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Array),
          pagination: expect.objectContaining({ total: 1 }),
        })
      );
    });

    it("deve filtrar por status", async () => {
      mockPrisma.company.findMany.mockResolvedValue([]);
      mockPrisma.company.count.mockResolvedValue(0);

      req = { query: { status: "ACTIVE" } };

      await controller.listCompanies(req, res);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
    });

    it("deve retornar 400 com parâmetros inválidos", async () => {
      req = { query: { page: "-1" } };

      await controller.listCompanies(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getCompanyDetails", () => {
    it("deve retornar detalhes da empresa", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440001", name: "Empresa", cnpj: "11222333000181", plan: "DYNAMIC", status: "ACTIVE",
        planExpiresAt: null, maxEmployees: null, settings: {}, trialUsed: true,
        createdAt: new Date(), updatedAt: new Date(),
        _count: { users: 5, checkIns: 100, subscriptions: 2 },
        users: [], subscriptions: [],
      });

      req = { params: { id: "550e8400-e29b-41d4-a716-446655440001" } };

      await controller.getCompanyDetails(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "550e8400-e29b-41d4-a716-446655440001",
          employeesCount: 5,
        })
      );
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440002" } };

      await controller.getCompanyDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getMetrics", () => {
    it("deve retornar métricas da plataforma", async () => {
      mockPrisma.company.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7)  // active
        .mockResolvedValueOnce(2)  // trial
        .mockResolvedValueOnce(1)  // suspended
        .mockResolvedValueOnce(0); // cancelled
      mockPrisma.company.groupBy.mockResolvedValue([{ plan: "DYNAMIC", _count: { plan: 10 } }]);
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.checkIn.count
        .mockResolvedValueOnce(200) // this month
        .mockResolvedValueOnce(150); // last month
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      req = {};

      await controller.getMetrics(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companies: expect.objectContaining({ total: 10 }),
          users: expect.objectContaining({ total: 50 }),
        })
      );
    });
  });

  describe("updateCompanyPlan", () => {
    it("deve atualizar plano da empresa", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440001", name: "Empresa", plan: "DYNAMIC", maxEmployees: null,
        _count: { users: 5 },
      });
      mockPrisma.subscription.updateMany.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440001", name: "Empresa", plan: "ENTERPRISE_CUSTOM", status: "ACTIVE", maxEmployees: 50,
      });
      mockPrisma.subscription.create.mockResolvedValue({});

      req = {
        params: { id: "550e8400-e29b-41d4-a716-446655440001" },
        body: { plan: "ENTERPRISE_CUSTOM", maxEmployees: 50 },
      };

      await controller.updateCompanyPlan(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "ENTERPRISE_CUSTOM" })
      );
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440002" }, body: { plan: "DYNAMIC" } };

      await controller.updateCompanyPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateCompanyStatus", () => {
    it("deve atualizar status da empresa", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440001", name: "E" });
      mockPrisma.company.update.mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440001", name: "E", status: "SUSPENDED" });

      req = {
        params: { id: "550e8400-e29b-41d4-a716-446655440001" },
        body: { status: "SUSPENDED" },
      };

      await controller.updateCompanyStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: "SUSPENDED" })
      );
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440002" }, body: { status: "ACTIVE" } };

      await controller.updateCompanyStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("extendTrial", () => {
    it("deve estender trial da empresa", async () => {
      const expiresAt = new Date("2026-09-01");
      mockPrisma.company.findUnique.mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440001", name: "E", planExpiresAt: expiresAt });
      mockPrisma.company.update.mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440001", name: "E", planExpiresAt: new Date("2026-10-01") });

      req = {
        params: { id: "550e8400-e29b-41d4-a716-446655440001" },
        body: { days: 30 },
      };

      await controller.extendTrial(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ planExpiresAt: expect.any(Date) })
      );
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440002" }, body: { days: 30 } };

      await controller.extendTrial(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("impersonate", () => {
    it("deve gerar token de impersonation", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440001", name: "Empresa", plan: "DYNAMIC", status: "ACTIVE",
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440003", name: "Admin", email: "admin@test.com", role: "ENTERPRISE_ADMIN",
      });

      req = {
        params: { id: "550e8400-e29b-41d4-a716-446655440001" },
        user: { id: "550e8400-e29b-41d4-a716-446655440003" },
        ip: "127.0.0.1",
        get: vi.fn().mockReturnValue("test-agent"),
      };

      await controller.impersonate(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          expiresIn: 3600,
        })
      );
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440002" }, user: { id: "550e8400-e29b-41d4-a716-446655440003" } };

      await controller.impersonate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 400 quando empresa está cancelada", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440001", name: "E", plan: "DYNAMIC", status: "CANCELLED",
      });
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: "550e8400-e29b-41d4-a716-446655440003" } };

      await controller.impersonate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 404 quando não há usuários na empresa", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440001", name: "E", plan: "DYNAMIC", status: "ACTIVE",
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: "550e8400-e29b-41d4-a716-446655440003" } };

      await controller.impersonate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

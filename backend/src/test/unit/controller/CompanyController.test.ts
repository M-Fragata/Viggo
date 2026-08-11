import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  company: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  subscription: { create: vi.fn() },
  consentimento: { createMany: vi.fn() },
  inviteToken: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  inviteTokenUsage: { create: vi.fn() },
  checkIn: { count: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../services/asaasService.js", () => ({
  createCustomer: vi.fn().mockResolvedValue({ id: "asaas-cust-1" }),
}));

vi.mock("../../../utils/cpfCnpjValidator.js", () => ({
  validateDocument: vi.fn().mockReturnValue({ valid: true, formatted: "529.982.247-25" }),
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  encryptCpf: vi.fn().mockReturnValue("encrypted-cpf"),
  decryptCpf: vi.fn().mockReturnValue("52998224725"),
  formatCpfDigits: vi.fn().mockReturnValue("52998224725"),
  hashCpf: vi.fn().mockReturnValue("cpf-hash"),
}));

vi.mock("../../../utils/formattName.js", () => ({
  FormattName: vi.fn().mockReturnValue("João Silva"),
}));

import { CompanyController } from "../../../controller/company/CompanyController.js";

describe("CompanyController", () => {
  let controller: CompanyController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new CompanyController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe("getMe", () => {
    it("deve retornar dados da empresa com limites e pricing", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "c1", name: "Empresa", cnpj: "11222333000181", plan: "DYNAMIC",
        status: "ACTIVE", planExpiresAt: new Date(), maxEmployees: null,
        settings: {}, trialUsed: true, billingType: null, asaasPaymentMethod: null,
        createdAt: new Date(), _count: { users: 5 },
      });

      req = { user: { companyId: "c1" } };

      await controller.getMe(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "c1",
          currentEmployees: 5,
          pricing: expect.any(Object),
        })
      );
    });

    it("deve retornar 401 quando não há companyId", async () => {
      req = { user: {} };

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      req = { user: { companyId: "c1" } };

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateMe", () => {
    it("deve atualizar nome da empresa", async () => {
      mockPrisma.company.update.mockResolvedValue({
        id: "c1", name: "Nova Empresa", cnpj: "11222333000181", plan: "DYNAMIC",
        status: "ACTIVE", planExpiresAt: null, maxEmployees: null, settings: {},
      });

      req = { user: { companyId: "c1" }, body: { name: "Nova Empresa" } };

      await controller.updateMe(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Nova Empresa" })
      );
    });

    it("deve retornar 400 com dados inválidos", async () => {
      req = { user: { companyId: "c1" }, body: { settings: { primaryColor: "invalid" } } };

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getUsage", () => {
    it("deve retornar dados de uso da empresa", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        plan: "DYNAMIC", maxEmployees: null, _count: { users: 3, checkIns: 100 },
      });
      mockPrisma.checkIn.count.mockResolvedValue(10);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", name: "João", role: "EMPLOYEE", email: "j@test.com", companyId: "c1", createdAt: new Date() },
      ]);

      req = { user: { companyId: "c1" } };

      await controller.getUsage(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          employees: expect.objectContaining({ current: 3 }),
          checkins: expect.objectContaining({ total: 100 }),
        })
      );
    });
  });

  describe("createInviteToken", () => {
    it("deve criar token de convite", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        plan: "DYNAMIC", maxEmployees: null, _count: { users: 3 },
      });
      mockPrisma.inviteToken.create.mockResolvedValue({
        id: "tok-1", token: "abc123", expiresAt: new Date(), maxUses: null,
        currentUses: 0, revokedAt: null, createdAt: new Date(),
      });

      req = {
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { expiresInDays: 7 },
      };

      await controller.createInviteToken(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          inviteUrl: expect.stringContaining("/accept-invite/"),
        })
      );
    });

    it("deve retornar 403 quando não é admin", async () => {
      req = {
        user: { companyId: "c1", role: "EMPLOYEE" },
        body: {},
      };

      await controller.createInviteToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("listInviteTokens", () => {
    it("deve listar tokens de convite", async () => {
      mockPrisma.inviteToken.findMany.mockResolvedValue([]);

      req = { user: { companyId: "c1" } };

      await controller.listInviteTokens(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe("getInviteByToken", () => {
    it("deve retornar dados do convite", async () => {
      mockPrisma.inviteToken.findUnique.mockResolvedValue({
        id: "tok-1", token: "abc123", revokedAt: null, expiresAt: new Date("2027-01-01"),
        maxUses: null, currentUses: 0,
        company: { id: "c1", name: "Empresa", plan: "DYNAMIC", settings: {} },
      });

      req = { params: { token: "550e8400-e29b-41d4-a716-446655440001" } };

      await controller.getInviteByToken(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          company: expect.objectContaining({ name: "Empresa" }),
        })
      );
    });

    it("deve retornar 404 quando token não existe", async () => {
      mockPrisma.inviteToken.findUnique.mockResolvedValue(null);
      req = { params: { token: "550e8400-e29b-41d4-a716-446655440002" } };

      await controller.getInviteByToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 400 quando token foi revogado", async () => {
      mockPrisma.inviteToken.findUnique.mockResolvedValue({
        token: "abc", revokedAt: new Date(), expiresAt: new Date("2027-01-01"),
        maxUses: null, currentUses: 0,
        company: { id: "c1", name: "E", plan: "DYNAMIC", settings: {} },
      });
      req = { params: { token: "550e8400-e29b-41d4-a716-446655440003" } };

      await controller.getInviteByToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 400 quando token expirou", async () => {
      mockPrisma.inviteToken.findUnique.mockResolvedValue({
        token: "abc", revokedAt: null, expiresAt: new Date("2020-01-01"),
        maxUses: null, currentUses: 0,
        company: { id: "c1", name: "E", plan: "DYNAMIC", settings: {} },
      });
      req = { params: { token: "550e8400-e29b-41d4-a716-446655440003" } };

      await controller.getInviteByToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("revokeInviteToken", () => {
    it("deve revogar token de convite", async () => {
      mockPrisma.inviteToken.findFirst.mockResolvedValue({
        id: "tok-1", companyId: "c1", revokedAt: null,
      });
      mockPrisma.inviteToken.update.mockResolvedValue({});

      req = {
        params: { id: "550e8400-e29b-41d4-a716-446655440001" },
        user: { companyId: "c1" },
      };

      await controller.revokeInviteToken(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: "Token de convite revogado" });
    });

    it("deve retornar 404 quando token não existe", async () => {
      mockPrisma.inviteToken.findFirst.mockResolvedValue(null);
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440002" }, user: { companyId: "c1" } };

      await controller.revokeInviteToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 400 quando token já foi revogado", async () => {
      mockPrisma.inviteToken.findFirst.mockResolvedValue({
        id: "tok-1", companyId: "c1", revokedAt: new Date(),
      });
      req = { params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { companyId: "c1" } };

      await controller.revokeInviteToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

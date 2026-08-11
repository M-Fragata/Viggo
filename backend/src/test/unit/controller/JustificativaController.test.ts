import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExtendedPrisma = vi.hoisted(() => ({
  checkIn: { findFirst: vi.fn() },
  justificativa: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

import { JustificativaController } from "../../../controller/JustificativaController.js";

describe("JustificativaController", () => {
  let controller: JustificativaController;
  let req: any;
  let res: any;

  const UUID_JUST = "550e8400-e29b-41d4-a716-446655440001";
  const UUID_CHECKIN = "550e8400-e29b-41d4-a716-446655440002";
  const UUID_CHECKIN_BAD = "550e8400-e29b-41d4-a716-446655440003";

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new JustificativaController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe("create", () => {
    it("deve criar justificativa sem checkinId", async () => {
      const mockJustificativa = {
        id: UUID_JUST,
        tipo: "ABONO",
        descricao: "Consulta médica agendada",
        dataInicio: new Date("2026-08-10"),
        dataFim: null,
        userId: "user-1",
        companyId: "company-1",
        checkinId: null,
        aprovado: null,
      };
      mockExtendedPrisma.justificativa.create.mockResolvedValue(mockJustificativa);

      req = {
        user: { id: "user-1", companyId: "company-1", role: "EMPLOYEE" },
        body: {
          tipo: "ABONO",
          descricao: "Consulta médica agendada",
          dataInicio: "2026-08-10",
        },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockExtendedPrisma.justificativa.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: "ABONO",
          descricao: "Consulta médica agendada",
          userId: "user-1",
          companyId: "company-1",
          aprovado: null,
        }),
      });
    });

    it("deve criar justificativa com checkinId válido", async () => {
      mockExtendedPrisma.checkIn.findFirst.mockResolvedValue({ id: UUID_CHECKIN });
      mockExtendedPrisma.justificativa.create.mockResolvedValue({
        id: UUID_JUST,
        tipo: "ATESTADO",
        checkinId: UUID_CHECKIN,
      });

      req = {
        user: { id: "user-1", companyId: "company-1", role: "EMPLOYEE" },
        body: {
          tipo: "ATESTADO",
          descricao: "Atestado médico para retorno ao trabalho",
          dataInicio: "2026-08-10",
          dataFim: "2026-08-12",
          checkinId: UUID_CHECKIN,
        },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockExtendedPrisma.checkIn.findFirst).toHaveBeenCalledWith({
        where: { id: UUID_CHECKIN, userId: "user-1", companyId: "company-1" },
      });
    });

    it("deve retornar 404 quando checkinId não pertence ao usuário", async () => {
      mockExtendedPrisma.checkIn.findFirst.mockResolvedValue(null);

      req = {
        user: { id: "user-1", companyId: "company-1", role: "EMPLOYEE" },
        body: {
          tipo: "FALTA",
          descricao: "Justificativa de falta não justificada",
          dataInicio: "2026-08-10",
          checkinId: UUID_CHECKIN_BAD,
        },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Check-in não encontrado" });
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = {
        user: { id: "user-1", companyId: null, role: "EMPLOYEE" },
        body: {
          tipo: "ABONO",
          descricao: "Justificativa genérica para ausência",
          dataInicio: "2026-08-10",
        },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Acesso negado" });
    });

    it("deve retornar 400 com dados inválidos", async () => {
      req = {
        user: { id: "user-1", companyId: "company-1", role: "EMPLOYEE" },
        body: { tipo: "INVALID" },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("list", () => {
    it("deve listar justificativas do funcionário", async () => {
      const mockJustificativas = [
        { id: UUID_JUST, tipo: "ABONO", user: { id: "user-1", name: "João", email: "j@test.com" } },
      ];
      mockExtendedPrisma.justificativa.findMany.mockResolvedValue(mockJustificativas);

      req = {
        user: { id: "user-1", companyId: "company-1", role: "EMPLOYEE" },
      };

      await controller.list(req, res);

      expect(mockExtendedPrisma.justificativa.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", companyId: "company-1" },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      expect(res.json).toHaveBeenCalledWith(mockJustificativas);
    });

    it("deve listar todas as justificativas da empresa para admin", async () => {
      mockExtendedPrisma.justificativa.findMany.mockResolvedValue([]);

      req = {
        user: { id: "admin-1", companyId: "company-1", role: "ENTERPRISE_ADMIN" },
      };

      await controller.list(req, res);

      expect(mockExtendedPrisma.justificativa.findMany).toHaveBeenCalledWith({
        where: { companyId: "company-1" },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { id: "user-1", companyId: null, role: "EMPLOYEE" } };

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("approve", () => {
    it("deve aprovar justificativa", async () => {
      const mockJustificativa = { id: UUID_JUST, companyId: "company-1", aprovado: null };
      mockExtendedPrisma.justificativa.findFirst.mockResolvedValue(mockJustificativa);
      mockExtendedPrisma.justificativa.update.mockResolvedValue({
        ...mockJustificativa,
        aprovado: true,
        aprovadoPor: "admin-1",
      });

      req = {
        params: { id: UUID_JUST },
        user: { id: "admin-1", companyId: "company-1", role: "ENTERPRISE_ADMIN" },
        body: { aprovado: true },
      };

      await controller.approve(req, res);

      expect(mockExtendedPrisma.justificativa.update).toHaveBeenCalledWith({
        where: { id: UUID_JUST },
        data: { aprovado: true, aprovadoPor: "admin-1" },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ aprovado: true })
      );
    });

    it("deve rejeitar justificativa", async () => {
      mockExtendedPrisma.justificativa.findFirst.mockResolvedValue({
        id: UUID_JUST,
        companyId: "company-1",
      });
      mockExtendedPrisma.justificativa.update.mockResolvedValue({
        id: UUID_JUST,
        aprovado: false,
      });

      req = {
        params: { id: UUID_JUST },
        user: { id: "admin-1", companyId: "company-1", role: "ENTERPRISE_ADMIN" },
        body: { aprovado: false },
      };

      await controller.approve(req, res);

      expect(mockExtendedPrisma.justificativa.update).toHaveBeenCalledWith({
        where: { id: UUID_JUST },
        data: { aprovado: false, aprovadoPor: "admin-1" },
      });
    });

    it("deve retornar 403 quando não é admin", async () => {
      req = {
        params: { id: UUID_JUST },
        user: { id: "user-1", companyId: "company-1", role: "EMPLOYEE" },
        body: { aprovado: true },
      };

      await controller.approve(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Apenas administradores podem aprovar" });
    });

    it("deve retornar 404 quando justificativa não existe", async () => {
      mockExtendedPrisma.justificativa.findFirst.mockResolvedValue(null);

      req = {
        params: { id: UUID_JUST },
        user: { id: "admin-1", companyId: "company-1", role: "ENTERPRISE_ADMIN" },
        body: { aprovado: true },
      };

      await controller.approve(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Justificativa não encontrada" });
    });

    it("deve retornar 400 com body inválido", async () => {
      req = {
        params: { id: UUID_JUST },
        user: { id: "admin-1", companyId: "company-1", role: "ENTERPRISE_ADMIN" },
        body: {},
      };

      await controller.approve(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

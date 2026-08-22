import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockExtendedPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  company: { findUnique: vi.fn() },
  checkIn: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

vi.mock("../../../utils/nsrGenerator.js", () => ({
  getNextNSR: vi.fn().mockResolvedValue(1),
  currentYear: vi.fn().mockReturnValue(2026),
  NsrLimitExceededError: class NsrLimitExceededError extends Error {},
}));

vi.mock("../../../utils/comprovanteGenerator.js", () => ({
  gerarComprovante: vi.fn().mockReturnValue({
    texto: "Comprovante de Ponto\nNSR: 000001\nHASH: a".repeat(6),
    hashVerificacao: "abc123",
  }),
}));

vi.mock("../../../utils/toleranceCalculator.js", () => ({
  aplicarTolerancia: vi.fn().mockReturnValue({ horarioEfetivo: new Date(), dentroDaTolerancia: true, minutosExcedentes: 0 }),
  minutosParaDate: vi.fn().mockReturnValue(new Date()),
  tipoParaHorarioPrevisto: vi.fn().mockReturnValue(480),
  tipoParaTolerancia: vi.fn().mockReturnValue(5),
  isDiaUtil: vi.fn().mockReturnValue(false),
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("52998224725"),
  formatCpfDigits: vi.fn().mockReturnValue("52998224725"),
}));

vi.mock("../../../services/relatorioMensalService.js", () => ({
  gerarRelatorioMensal: vi.fn().mockResolvedValue({
    csv: "header\nrow1",
    hash: "hash123",
    filename: "relatorio.csv",
  }),
  gerarRelatorioMensalPdf: vi.fn().mockResolvedValue({
    pdf: Buffer.from("%PDF-1.7 mock"),
    hash: "hash123",
    filename: "relatorio.pdf",
  }),
}));

import { CheckinController } from "../../../controller/CheckinController.js";
import { getNextNSR, NsrLimitExceededError } from "../../../utils/nsrGenerator.js";
import { gerarComprovante } from "../../../utils/comprovanteGenerator.js";
import { gerarRelatorioMensal, gerarRelatorioMensalPdf } from "../../../services/relatorioMensalService.js";

describe("CheckinController", () => {
  let controller: CheckinController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExtendedPrisma.user.findMany = vi.fn();
    mockExtendedPrisma.user.findUnique = vi.fn();
    mockExtendedPrisma.company.findUnique = vi.fn();
    mockExtendedPrisma.checkIn.findFirst = vi.fn();
    mockExtendedPrisma.checkIn.findMany = vi.fn();
    mockExtendedPrisma.$transaction = vi.fn();
    controller = new CheckinController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockUser = {
    id: "user-1",
    name: "João",
    companyId: "company-1",
    cpf: "encrypted",
    faceDescriptor: "enc",
    workSchedule: null,
  };

  const mockCompany = { cnpj: "11222333000181", name: "Empresa Teste" };

  describe("createCheckin", () => {
    it("deve criar checkin com NSR e comprovante", async () => {
      mockExtendedPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, workSchedule: null });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
      mockExtendedPrisma.company.findUnique.mockResolvedValue(mockCompany);
      mockExtendedPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          checkIn: { create: vi.fn().mockResolvedValue({
            id: "c1", nsr: 1, ano: 2026, type: "ENTRY", createdAt: new Date(),
            latitude: -23.55, longitude: -46.63, employerCnpj: "11222333000181",
          }) },
        });
      });

      req = {
        user: { id: "user-1", companyId: "company-1" },
        body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 },
      };

      await controller.createCheckin(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          comprovante: expect.any(String),
          hashVerificacao: expect.any(String),
        })
      );
    });

    it("deve bloquear checkin duplicada no mesmo dia", async () => {
      mockExtendedPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, workSchedule: null });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([{ type: "ENTRY" }]);

      req = {
        user: { id: "user-1", companyId: "company-1" },
        body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 },
      };

      await controller.createCheckin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("já registrado hoje") })
      );
    });

    it("deve retornar 404 quando usuário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);

      req = {
        user: { id: "user-not-found", companyId: "company-1" },
        body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 },
      };

      await controller.createCheckin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockExtendedPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, workSchedule: null });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
      mockExtendedPrisma.company.findUnique.mockResolvedValue(null);

      req = {
        user: { id: "user-1", companyId: "company-1" },
        body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 },
      };

      await controller.createCheckin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Empresa não encontrada" });
    });

    it("deve retornar 400 com dados inválidos (type inválido)", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockUser);

      req = {
        user: { id: "user-1", companyId: "company-1" },
        body: { type: "INVALID" },
      };

      await controller.createCheckin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao registrar ponto"),
        expect.anything()
      );
    });

    it("deve retornar 503 quando NSR excede limite", async () => {
      mockExtendedPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, workSchedule: null });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
      mockExtendedPrisma.company.findUnique.mockResolvedValue(mockCompany);
      (getNextNSR as any).mockRejectedValue(new (NsrLimitExceededError as any)("limit"));
      mockExtendedPrisma.$transaction.mockImplementation(async (fn: any) => fn({
        checkIn: { create: vi.fn() },
      }));

      req = {
        user: { id: "user-1", companyId: "company-1" },
        body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 },
      };

      await controller.createCheckin(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe("index", () => {
    it("deve listar checkins do usuário para a data", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([
        { id: "c1", type: "ENTRY", createdAt: new Date() },
      ]);

      req = {
        user: { id: "user-1" },
        query: { date: "2026-08-10" },
      };

      await controller.index(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("deve usar data atual quando não informada", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);

      req = { user: { id: "user-1" }, query: {} };

      await controller.index(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve retornar 404 quando usuário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);

      req = { user: { id: "u-not" }, query: {} };

      await controller.index(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("listByCompany", () => {
    it("deve listar checkins agrupados por funcionário", async () => {
      mockExtendedPrisma.user.findMany.mockResolvedValue([
        { id: "emp-1", name: "João" },
      ]);
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([
        { id: "c1", userId: "emp-1", type: "ENTRY", createdAt: new Date(), latitude: -23.55, longitude: -46.63 },
      ]);

      req = {
        user: { companyId: "company-1" },
        query: { date: "2026-08-10" },
      };

      await controller.listByCompany(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            employeeId: "emp-1",
            checkins: expect.any(Array),
          }),
        ])
      );
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { companyId: null }, query: {} };

      await controller.listByCompany(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("listMonthly", () => {
    it("deve listar folha mensal agrupada por funcionário", async () => {
      mockExtendedPrisma.user.findMany.mockResolvedValue([
        { id: "emp-1", name: "João" },
      ]);
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([
        { id: "c1", userId: "emp-1", type: "ENTRY", createdAt: new Date() },
      ]);

      req = {
        user: { companyId: "company-1" },
        query: { year: "2026", month: "8" },
      };

      await controller.listMonthly(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("deve retornar 400 com parâmetros inválidos", async () => {
      req = {
        user: { companyId: "company-1" },
        query: { year: "abc", month: "x" },
      };

      await controller.listMonthly(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao buscar folha mensal"),
        expect.anything()
      );
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { companyId: null }, query: { year: "2026", month: "8" } };

      await controller.listMonthly(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("exportRelatorioMensal", () => {
    it("deve exportar relatório mensal como CSV", async () => {
      req = {
        user: { companyId: "company-1" },
        query: { year: "2026", month: "8" },
      };

      await controller.exportRelatorioMensal(req, res);

      expect(gerarRelatorioMensal).toHaveBeenCalledWith("company-1", 2026, 8);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
      expect(res.send).toHaveBeenCalledWith("header\nrow1");
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { companyId: null }, query: { year: "2026", month: "8" } };

      await controller.exportRelatorioMensal(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve exportar relatório em PDF quando format=pdf", async () => {
      req = {
        user: { companyId: "company-1" },
        query: { year: "2026", month: "8", format: "pdf" },
      };

      await controller.exportRelatorioMensal(req, res);

      expect(gerarRelatorioMensalPdf).toHaveBeenCalledWith("company-1", 2026, 8);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it("deve usar CSV por padrão quando format não informado", async () => {
      req = {
        user: { companyId: "company-1" },
        query: { year: "2026", month: "8" },
      };

      await controller.exportRelatorioMensal(req, res);

      expect(gerarRelatorioMensal).toHaveBeenCalledWith("company-1", 2026, 8);
      expect(gerarRelatorioMensalPdf).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    });

    it("deve retornar 400 com format inválido", async () => {
      req = {
        user: { companyId: "company-1" },
        query: { year: "2026", month: "8", format: "xlsx" },
      };

      await controller.exportRelatorioMensal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 400 com parâmetros inválidos", async () => {
      req = {
        user: { companyId: "company-1" },
        query: { year: "abc", month: "x" },
      };

      await controller.exportRelatorioMensal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao gerar relatório mensal"),
        expect.anything()
      );
    });
  });
});

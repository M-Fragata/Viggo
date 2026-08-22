import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExtendedPrisma = vi.hoisted(() => ({
  company: { findUnique: vi.fn() },
  checkIn: { findMany: vi.fn() },
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("529.982.247-25"),
}));

import { AfdController } from "../../../controller/AfdController.js";

describe("AfdController", () => {
  let controller: AfdController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AfdController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
    };
  });

  describe("exportAfd", () => {
    it("deve gerar AFD com header, detalhes e trailer", async () => {
      mockExtendedPrisma.company.findUnique.mockResolvedValue({
        cnpj: "11222333000181",
        name: "Empresa Teste",
      });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([
        {
          nsr: 1,
          ano: 2026,
          type: "ENTRY",
          createdAt: new Date("2026-08-10T08:00:00"),
          employerCnpj: "11222333000181",
          user: { cpf: "encrypted-cpf", name: "João" },
        },
        {
          nsr: 2,
          ano: 2026,
          type: "EXIT",
          createdAt: new Date("2026-08-10T17:00:00"),
          employerCnpj: "11222333000181",
          user: { cpf: "encrypted-cpf", name: "João" },
        },
      ]);

      req = {
        user: { companyId: "c1" },
        query: { startDate: "2026-08-10", endDate: "2026-08-10" },
      };

      await controller.exportAfd(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain; charset=utf-8");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment")
      );

      const content = res.send.mock.calls[0][0];
      const lines = content.split("\n");

      expect(lines[0]).toMatch(/^1\|11222333000181\|/);
      // header + 2 detalhes + trailer + HASH (B1: signContent)
      expect(lines.length).toBe(5);
      expect(lines[3]).toMatch(/^9\|11222333000181\|000002$/);
      expect(lines[4]).toMatch(/^HASH: [a-f0-9]{64}$/);
      expect(res.setHeader).toHaveBeenCalledWith("X-Hash-SHA256", expect.stringMatching(/^[a-f0-9]{64}$/));
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = {
        user: { companyId: null },
        query: { startDate: "2026-08-10", endDate: "2026-08-10" },
      };

      await controller.exportAfd(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockExtendedPrisma.company.findUnique.mockResolvedValue(null);

      req = {
        user: { companyId: "c1" },
        query: { startDate: "2026-08-10", endDate: "2026-08-10" },
      };

      await controller.exportAfd(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 400 quando CNPJ não está definido", async () => {
      mockExtendedPrisma.company.findUnique.mockResolvedValue({
        cnpj: null,
        name: "Empresa",
      });

      req = {
        user: { companyId: "c1" },
        query: { startDate: "2026-08-10", endDate: "2026-08-10" },
      };

      await controller.exportAfd(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "CNPJ da empresa é obrigatório para gerar o AFD" });
    });

    it("deve retornar 400 com parâmetros inválidos", async () => {
      req = {
        user: { companyId: "c1" },
        query: { startDate: "invalid" },
      };

      await controller.exportAfd(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve gerar AFD vazio (só header e trailer) quando não há checkins", async () => {
      mockExtendedPrisma.company.findUnique.mockResolvedValue({
        cnpj: "11222333000181",
        name: "Empresa",
      });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);

      req = {
        user: { companyId: "c1" },
        query: { startDate: "2026-08-10", endDate: "2026-08-10" },
      };

      await controller.exportAfd(req, res);

      const content = res.send.mock.calls[0][0];
      const lines = content.split("\n");
      // header + trailer + HASH (B1)
      expect(lines.length).toBe(3);
      expect(lines[1]).toMatch(/^9\|11222333000181\|000000$/);
      expect(lines[2]).toMatch(/^HASH: [a-f0-9]{64}$/);
    });
  });
});

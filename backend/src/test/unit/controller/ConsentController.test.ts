import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    consentimento: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { ConsentController } from "../../../controller/ConsentController.js";
import { prisma } from "../../../database/prisma.js";

describe("ConsentController", () => {
  let controller: ConsentController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    controller = new ConsentController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("deve criar consentimento com upsert", async () => {
      const mockConsent = {
        id: "consent-1",
        userId: "user-1",
        tipo: "BIOMETRIA",
        versao: "1.0",
        aceite: true,
        ip: "127.0.0.1",
        createdAt: new Date(),
      };
      (prisma.consentimento.upsert as any).mockResolvedValue(mockConsent);

      req = {
        user: { id: "user-1" },
        body: { tipo: "BIOMETRIA", versao: "1.0", aceite: true },
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prisma.consentimento.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_tipo_versao: { userId: "user-1", tipo: "BIOMETRIA", versao: "1.0" },
          }),
          update: { aceite: true },
          create: expect.objectContaining({
            userId: "user-1",
            tipo: "BIOMETRIA",
            versao: "1.0",
            aceite: true,
          }),
        })
      );
    });

    it("deve retornar 400 com dados inválidos", async () => {
      req = {
        user: { id: "user-1" },
        body: { tipo: "INVALID", versao: "", aceite: true },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 500 em caso de erro", async () => {
      (prisma.consentimento.upsert as any).mockRejectedValue(new Error("DB error"));
      req = {
        user: { id: "user-1" },
        body: { tipo: "TERMOS_DE_USO", versao: "1.0", aceite: true },
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Erro ao registrar consentimento" });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao registrar consentimento"),
        expect.anything()
      );
    });
  });

  describe("list", () => {
    it("deve listar consentimentos do usuário", async () => {
      const mockConsents = [
        { tipo: "TERMOS_DE_USO", versao: "1.0", aceite: true, createdAt: new Date() },
        { tipo: "BIOMETRIA", versao: "1.0", aceite: true, createdAt: new Date() },
      ];
      (prisma.consentimento.findMany as any).mockResolvedValue(mockConsents);

      req = { user: { id: "user-1" } };

      await controller.list(req, res);

      expect(prisma.consentimento.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        select: { tipo: true, versao: true, aceite: true, createdAt: true },
      });
      expect(res.json).toHaveBeenCalledWith(mockConsents);
    });

    it("deve retornar array vazio quando não há consentimentos", async () => {
      (prisma.consentimento.findMany as any).mockResolvedValue([]);

      req = { user: { id: "user-1" } };

      await controller.list(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar 500 em caso de erro", async () => {
      (prisma.consentimento.findMany as any).mockRejectedValue(new Error("DB error"));

      req = { user: { id: "user-1" } };

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Erro ao listar consentimentos" });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao listar consentimentos"),
        expect.anything()
      );
    });
  });
});

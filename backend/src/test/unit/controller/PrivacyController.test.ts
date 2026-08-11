import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExtendedPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  checkIn: { findMany: vi.fn() },
  auditLog: { findMany: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
  consentimento: { findMany: vi.fn(), upsert: vi.fn() },
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptAndFormat: vi.fn().mockReturnValue("529.982.247-25"),
}));

vi.mock("../../../utils/faceEncryption.js", () => ({
  hasFaceDescriptor: vi.fn().mockReturnValue(true),
  decryptFaceDescriptor: vi.fn().mockReturnValue(new Float32Array(128).fill(0.5)),
}));

import { PrivacyController } from "../../../controller/PrivacyController.js";
import { hasFaceDescriptor } from "../../../utils/faceEncryption.js";

describe("PrivacyController", () => {
  let controller: PrivacyController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new PrivacyController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };
  });

  describe("getMyData", () => {
    it("deve retornar dados pessoais do usuário (DSAR)", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "u1", name: "João", email: "j@test.com", cpf: "encrypted-cpf",
        role: "EMPLOYEE", createdAt: new Date(), lastLoginAt: null, faceDescriptor: "enc",
      });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([
        { id: "c1", nsr: 1, createdAt: new Date(), type: "ENTRY", latitude: -23.55, longitude: -46.63, address: null },
      ]);
      mockPrisma.consentimento.findMany.mockResolvedValue([
        { tipo: "TERMOS_DE_USO", versao: "1.0", aceite: true, createdAt: new Date() },
      ]);

      req = { user: { id: "u1", companyId: "c1" } };

      await controller.getMyData(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          dadosPessoais: expect.objectContaining({ id: "u1" }),
          dadosBiometricos: expect.objectContaining({ possuiDescriptor: true }),
          registrosPonto: expect.any(Array),
          consentimentos: expect.any(Array),
        })
      );
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { id: "u1", companyId: null } };

      await controller.getMyData(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 404 quando usuário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);
      req = { user: { id: "u1", companyId: "c1" } };

      await controller.getMyData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateMyData", () => {
    it("deve atualizar nome", async () => {
      mockExtendedPrisma.user.update.mockResolvedValue({
        id: "u1", name: "João Updated", email: "j@test.com",
      });

      req = {
        user: { id: "u1" },
        body: { name: "João Updated" },
      };

      await controller.updateMyData(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Dados atualizados com sucesso",
          user: expect.objectContaining({ name: "João Updated" }),
        })
      );
    });

    it("deve retornar 400 quando nenhum campo é fornecido", async () => {
      req = { user: { id: "u1" }, body: {} };

      await controller.updateMyData(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Nenhum campo para atualizar" });
    });

    it("deve retornar 400 quando email já está em uso", async () => {
      mockExtendedPrisma.user.findFirst.mockResolvedValue({ id: "u-other" });

      req = {
        user: { id: "u1" },
        body: { email: "taken@test.com" },
      };

      await controller.updateMyData(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email já está em uso" });
    });
  });

  describe("exportMyData", () => {
    it("deve exportar dados como JSON para download", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "u1", name: "João", email: "j@test.com", cpf: "enc",
        role: "EMPLOYEE", createdAt: new Date(), lastLoginAt: null, faceDescriptor: "enc",
      });
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
      mockPrisma.consentimento.findMany.mockResolvedValue([]);

      req = { user: { id: "u1", companyId: "c1" } };

      await controller.exportMyData(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/json; charset=utf-8");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment")
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.any(Object),
          dadosPessoais: expect.any(Object),
        })
      );
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { id: "u1", companyId: null } };

      await controller.exportMyData(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("deleteMyFace", () => {
    it("deve remover descriptor facial e revogar consentimento", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "u1", faceDescriptor: "encrypted-face",
      });
      mockExtendedPrisma.user.update.mockResolvedValue({});
      mockPrisma.consentimento.upsert.mockResolvedValue({});

      req = { user: { id: "u1" }, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } };

      await controller.deleteMyFace(req, res);

      expect(mockExtendedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "u1" },
          data: expect.objectContaining({ faceDescriptor: expect.any(Object) }),
        })
      );
      expect(mockPrisma.consentimento.upsert).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("removido com sucesso") })
      );
    });

    it("deve retornar 400 quando não há face cadastrada", async () => {
      vi.mocked(hasFaceDescriptor).mockReturnValue(false);
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "u1", faceDescriptor: null,
      });

      req = { user: { id: "u1" } };

      await controller.deleteMyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 404 quando usuário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);

      req = { user: { id: "u1" } };

      await controller.deleteMyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getMyLogs", () => {
    it("deve retornar logs de auditoria do usuário", async () => {
      mockExtendedPrisma.auditLog.findMany.mockResolvedValue([
        { action: "LOGIN", entity: "User", entityId: "u1", createdAt: new Date(), ip: "127.0.0.1", legalBasis: "Art. 7º", purpose: "Auth", personalDataCategories: ["IDENTIFICACAO"] },
      ]);

      req = { user: { id: "u1", companyId: "c1" } };

      await controller.getMyLogs(req, res);

      expect(res.json).toHaveBeenCalledWith({ logs: expect.any(Array) });
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { id: "u1", companyId: null } };

      await controller.getMyLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

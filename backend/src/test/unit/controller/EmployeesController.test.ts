import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockExtendedPrisma = vi.hoisted(() => ({
  user: { findMany: vi.fn(), findUnique: vi.fn() },
  checkIn: { findMany: vi.fn() },
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

vi.mock("../../../utils/euclideanDistance.js", () => ({
  euclideanDistance: vi.fn(),
}));

vi.mock("../../../utils/faceEncryption.js", () => ({
  decryptFaceDescriptor: vi.fn().mockReturnValue(new Float32Array(128).fill(0.5)),
  hasFaceDescriptor: vi.fn().mockReturnValue(true),
}));

import { EmployeesController } from "../../../controller/EmployeesController.js";
import { euclideanDistance } from "../../../utils/euclideanDistance.js";

describe("EmployeesController", () => {
  let controller: EmployeesController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    controller = new EmployeesController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getEmployees", () => {
    it("deve listar funcionários com checkins", async () => {
      const mockEmployees = [
        { id: "emp-1", name: "João", email: "j@test.com", role: "EMPLOYEE", companyId: "c1", faceDescriptor: "enc", workScheduleId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      const mockCheckins = [
        { id: "c1", userId: "emp-1", type: "ENTRY", createdAt: new Date() },
      ];
      mockExtendedPrisma.user.findMany.mockResolvedValue(mockEmployees);
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue(mockCheckins);

      req = {
        query: { date: "2026-08-10" },
      };

      await controller.getEmployees(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "emp-1",
            name: "João",
            checkins: expect.arrayContaining([expect.objectContaining({ type: "ENTRY" })]),
          }),
        ])
      );
    });

    it("deve retornar lista vazia quando não há funcionários", async () => {
      mockExtendedPrisma.user.findMany.mockResolvedValue([]);
      mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);

      req = { query: { date: "2026-08-10" } };

      await controller.getEmployees(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar 500 em caso de erro", async () => {
      mockExtendedPrisma.user.findMany.mockRejectedValue(new Error("DB error"));
      req = { query: { date: "2026-08-10" } };

      await controller.getEmployees(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("issueFaceToken", () => {
    it("deve gerar token com TTL de 30 segundos", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        faceDescriptor: "encrypted-face",
      });

      req = { user: { id: "user-1" } };

      await controller.issueFaceToken(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          expiresIn: 30,
        })
      );
    });

    it("deve retornar 404 quando usuário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);

      req = { user: { id: "user-not-found" } };

      await controller.issueFaceToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Usuário não encontrado" });
    });

    it("deve retornar 403 quando face não está cadastrada", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        faceDescriptor: null,
      });

      req = { user: { id: "user-1" } };

      await controller.issueFaceToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "FACE_NOT_REGISTERED" })
      );
    });
  });

  describe("verifyFace", () => {
    it("deve validar descriptor com token válido (distância baixa)", async () => {
      (euclideanDistance as any).mockReturnValue(0.3);

      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        faceDescriptor: "encrypted-face",
      });

      req = { user: { id: "user-1" } };
      await controller.issueFaceToken(req, res);

      const token = res.json.mock.calls[0][0].token;

      res = { json: vi.fn() };
      req = {
        user: { id: "user-1" },
        body: { token, descriptor: new Array(128).fill(0.5) },
      };

      await controller.verifyFace(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, distance: 0.3 })
      );
    });

    it("deve rejeitar rosto não reconhecido (distância alta)", async () => {
      (euclideanDistance as any).mockReturnValue(1.2);

      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        faceDescriptor: "encrypted-face",
      });

      req = { user: { id: "user-1" } };
      await controller.issueFaceToken(req, res);

      const token = res.json.mock.calls[0][0].token;

      res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      req = {
        user: { id: "user-1" },
        body: { token, descriptor: new Array(128).fill(0.5) },
      };

      await controller.verifyFace(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("deve rejeitar token inexistente (UUID válido mas não emitido)", async () => {
      req = {
        user: { id: "user-1" },
        body: { token: "550e8400-e29b-41d4-a716-446655440000", descriptor: new Array(128).fill(0.5) },
      };

      await controller.verifyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Token inválido ou expirado" });
    });

    it("deve rejeitar token expirado (setTimeout removeu o token)", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        faceDescriptor: "encrypted-face",
      });

      req = { user: { id: "user-1" } };
      await controller.issueFaceToken(req, res);

      const token = res.json.mock.calls[0][0].token;

      vi.advanceTimersByTime(30001);

      res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      req = {
        user: { id: "user-1" },
        body: { token, descriptor: new Array(128).fill(0.5) },
      };

      await controller.verifyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Token inválido ou expirado" });
    });

    it("deve retornar 400 com dados inválidos", async () => {
      req = {
        user: { id: "user-1" },
        body: { token: "not-a-uuid" },
      };

      await controller.verifyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

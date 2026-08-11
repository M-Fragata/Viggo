import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../utils/faceEncryption.js", () => ({
  hasFaceDescriptor: vi.fn().mockReturnValue(true),
}));

import { AuthController } from "../../../controller/AuthController.js";
import { prisma } from "../../../database/prisma.js";
import { hasFaceDescriptor } from "../../../utils/faceEncryption.js";

describe("AuthController", () => {
  let controller: AuthController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    controller = new AuthController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("me", () => {
    it("deve retornar dados do usuário autenticado", async () => {
      const mockUser = {
        id: "user-1",
        name: "João Silva",
        email: "joao@test.com",
        role: "EMPLOYEE",
        companyId: "company-1",
        createdAt: new Date("2026-01-01"),
        faceDescriptor: "encrypted-descriptor",
      };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      req = { user: { id: "user-1" } };

      await controller.me(req, res);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          faceDescriptor: true,
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        user: {
          id: "user-1",
          name: "João Silva",
          email: "joao@test.com",
          role: "EMPLOYEE",
          companyId: "company-1",
          createdAt: new Date("2026-01-01"),
          hasFaceDescriptor: true,
        },
      });
    });

    it("deve retornar 401 quando não há userId", async () => {
      req = { user: {} };

      await controller.me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Usuário não identificado" });
    });

    it("deve retornar 404 quando usuário não existe", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      req = { user: { id: "user-not-found" } };

      await controller.me(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Usuário não encontrado" });
    });

    it("deve retornar hasFaceDescriptor false quando não há descriptor", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        name: "João",
        email: "joao@test.com",
        role: "EMPLOYEE",
        companyId: "company-1",
        createdAt: new Date(),
        faceDescriptor: null,
      });
      (hasFaceDescriptor as any).mockReturnValue(false);

      req = { user: { id: "user-1" } };

      await controller.me(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ hasFaceDescriptor: false }),
        })
      );
    });

    it("deve retornar 500 em caso de erro interno", async () => {
      (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));
      req = { user: { id: "user-1" } };

      await controller.me(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Erro ao buscar dados do usuário" });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao buscar usuário"),
        expect.anything()
      );
    });
  });
});

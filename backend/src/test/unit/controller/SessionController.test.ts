import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  company: { findUnique: vi.fn() },
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../utils/environment.js", () => ({
  Env: { JWT_SECRET: "test-secret-key-for-testing" },
}));

vi.mock("../../../utils/faceEncryption.js", () => ({
  encryptFaceDescriptor: vi.fn().mockReturnValue("encrypted-face"),
  hasFaceDescriptor: vi.fn().mockReturnValue(true),
}));

vi.mock("bcrypt", () => ({
  default: { compare: vi.fn() },
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn().mockReturnValue("mock-token") },
}));

import { SessionController } from "../../../controller/SessionController.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { encryptFaceDescriptor, hasFaceDescriptor } from "../../../utils/faceEncryption.js";

describe("SessionController", () => {
  let controller: SessionController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique = vi.fn();
    mockPrisma.user.update = vi.fn();
    mockPrisma.company.findUnique = vi.fn();
    (bcrypt.compare as any) = vi.fn();
    (jwt.sign as any) = vi.fn().mockReturnValue("mock-token");
    (encryptFaceDescriptor as any) = vi.fn().mockReturnValue("encrypted-face");
    (hasFaceDescriptor as any) = vi.fn().mockReturnValue(true);
    controller = new SessionController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  const mockUser = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "João",
    email: "joao@test.com",
    password: "hashed-password",
    role: "WORKER",
    companyId: "550e8400-e29b-41d4-a716-446655440002",
    cpf: "encrypted",
    faceDescriptor: "enc",
    company: { plan: "TIER_II" },
  };

  const mockOtherUser = {
    id: "550e8400-e29b-41d4-a716-446655440099",
    name: "Outro",
    email: "outro@test.com",
    password: "hashed-password",
    role: "WORKER",
    companyId: "550e8400-e29b-41d4-a716-446655440098",
    cpf: "encrypted",
    faceDescriptor: "enc",
    company: { plan: "TIER_I" },
  };

  const mockCompany = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Empresa Teste",
  };

  describe("login", () => {
    it("deve fazer login com credenciais válidas", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      req = {
        body: { email: "joao@test.com", password: "senha12345" },
      };

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ id: mockUser.id }),
          company: "Empresa Teste",
          token: "mock-token",
        })
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockUser.id }),
        expect.any(String),
        { expiresIn: "7d" }
      );
    });

    it("deve retornar 400 com email inexistente", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      req = { body: { email: "inexistente@test.com", password: "senha12345" } };

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("incorreto") })
      );
    });

    it("deve retornar 400 com senha incorreta", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      req = { body: { email: "joao@test.com", password: "senhaerrada" } };

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("incorreto") })
      );
    });

    it("deve retornar 400 quando empresa não encontrada", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.company.findUnique.mockResolvedValue(null);

      req = { body: { email: "joao@test.com", password: "senha12345" } };

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Trabalhador sem empresa" })
      );
    });

    it("deve retornar 400 com dados inválidos (ZodError)", async () => {
      req = { body: { email: "invalido", password: "curta" } };

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Dados inválidos" })
      );
    });

    it("deve retornar 500 em caso de erro interno", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"));

      req = { body: { email: "joao@test.com", password: "senha12345" } };

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("update", () => {
    it("deve atualizar face descriptor com sucesso", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});

      req = {
        user: { id: mockUser.id, companyId: mockUser.companyId },
        params: { userId: mockUser.id },
        body: { faceDescriptor: [0.1, 0.2, 0.3] },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Face registrada com sucesso!" })
      );
      expect(encryptFaceDescriptor).toHaveBeenCalledWith([0.1, 0.2, 0.3]);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ faceDescriptor: "encrypted-face" }),
        })
      );
    });

    it("deve retornar 404 quando tenta atualizar face de outro usuário (IDOR)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockOtherUser);

      req = {
        user: { id: mockUser.id, companyId: mockUser.companyId },
        params: { userId: mockOtherUser.id },
        body: { faceDescriptor: [0.1, 0.2, 0.3] },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Usuário não encontrado" })
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando usuário não encontrado", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      req = {
        user: { id: mockUser.id, companyId: mockUser.companyId },
        params: { userId: "550e8400-e29b-41d4-a716-446655440099" },
        body: { faceDescriptor: [0.1, 0.2, 0.3] },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Usuário não encontrado" })
      );
    });

    it("deve retornar 400 com UUID inválido", async () => {
      req = {
        user: { id: mockUser.id, companyId: mockUser.companyId },
        params: { userId: "invalid-uuid" },
        body: { faceDescriptor: [0.1, 0.2, 0.3] },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 400 com body inválido", async () => {
      req = {
        user: { id: mockUser.id, companyId: mockUser.companyId },
        params: { userId: "550e8400-e29b-41d4-a716-446655440001" },
        body: { faceDescriptor: "not-an-array" },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 500 em caso de erro interno", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"));

      req = {
        user: { id: mockUser.id, companyId: mockUser.companyId },
        params: { userId: mockUser.id },
        body: { faceDescriptor: [0.1, 0.2, 0.3] },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Erro ao salvar face" })
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    company: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../utils/faceEncryption.js", () => ({
  hasFaceDescriptor: vi.fn(),
  encryptFaceDescriptor: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  default: { compare: vi.fn() },
}));

import { AuthController } from "../../../controller/AuthController.js";
import { prisma } from "../../../database/prisma.js";
import { hasFaceDescriptor } from "../../../utils/faceEncryption.js";
import bcrypt from "bcrypt";

const mockPrisma = prisma as any;
const mockHasFaceDescriptor = hasFaceDescriptor as any;
const mockBcryptCompare = bcrypt.compare as any;

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const FAKE_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const FAKE_COMPANY_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

const FAKE_USER_DB = {
  id: FAKE_USER_ID,
  name: "João Silva",
  email: "joao@test.com",
  role: "ADMIN",
  companyId: FAKE_COMPANY_ID,
  createdAt: new Date("2026-01-01"),
  faceDescriptor: '{"type":"Buffer","data":[1,2,3,4]}',
  password: "$2b$10$hashedpasswordexample",
  cpf: "encrypted-cpf-value",
  cpfHash: "hash-of-cpf",
};

describe("Security: Vazamento de Informação em Respostas", () => {
  describe("AuthController.me — Dados Sensíveis", () => {
    let controller: AuthController;
    let res: any;

    beforeEach(() => {
      vi.clearAllMocks();
      controller = new AuthController();
      res = makeRes();
      mockHasFaceDescriptor.mockReturnValue(true);
    });

    it("deve retornar hasFaceDescriptor como boolean, não o blob", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(FAKE_USER_DB);

      const req = { user: { id: FAKE_USER_ID } } as any;
      await controller.me(req, res);

      const responseUser = res.json.mock.calls[0][0].user;
      expect(typeof responseUser.hasFaceDescriptor).toBe("boolean");
      expect(responseUser).not.toHaveProperty("faceDescriptor");
    });

    it("deve retornar false quando não há face descriptor", async () => {
      mockHasFaceDescriptor.mockReturnValue(false);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...FAKE_USER_DB,
        faceDescriptor: null,
      });

      const req = { user: { id: FAKE_USER_ID } } as any;
      await controller.me(req, res);

      const responseUser = res.json.mock.calls[0][0].user;
      expect(responseUser.hasFaceDescriptor).toBe(false);
    });

    it("não deve expor password na resposta", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(FAKE_USER_DB);

      const req = { user: { id: FAKE_USER_ID } } as any;
      await controller.me(req, res);

      const responseUser = res.json.mock.calls[0][0].user;
      expect(responseUser).not.toHaveProperty("password");
    });

    it("não deve expor cpf na resposta", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(FAKE_USER_DB);

      const req = { user: { id: FAKE_USER_ID } } as any;
      await controller.me(req, res);

      const responseUser = res.json.mock.calls[0][0].user;
      expect(responseUser).not.toHaveProperty("cpf");
      expect(responseUser).not.toHaveProperty("cpfHash");
    });

    it("deve retornar apenas campos esperados", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(FAKE_USER_DB);

      const req = { user: { id: FAKE_USER_ID } } as any;
      await controller.me(req, res);

      const responseUser = res.json.mock.calls[0][0].user;
      const allowedKeys = ["id", "name", "email", "role", "companyId", "createdAt", "hasFaceDescriptor"];
      const returnedKeys = Object.keys(responseUser);

      expect(returnedKeys.sort()).toEqual(allowedKeys.sort());
    });
  });

  describe("Erros Internos — Mensagens Genéricas", () => {
    let controller: AuthController;
    let res: any;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(console, "error").mockImplementation(() => {});
      controller = new AuthController();
      res = makeRes();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("deve retornar mensagem genérica em erro 500, não stack trace", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("DATABASE_CONNECTION_LOST"));

      const req = { user: { id: FAKE_USER_ID } } as any;
      await controller.me(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = res.json.mock.calls[0][0];
      expect(body.message).toBe("Erro ao buscar dados do usuário");
      expect(body).not.toHaveProperty("stack");
      expect(body).not.toHaveProperty("error");
      expect(body).not.toHaveProperty("details");
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao buscar usuário"),
        expect.anything()
      );
    });
  });

  describe("JWT — Payload Seguro", () => {
    it("token JWT deve conter apenas campos necessários", () => {
      const token = jwt.sign(
        {
          id: FAKE_USER_ID,
          role: "ADMIN",
          name: "João",
          email: "joao@test.com",
          companyName: "Empresa Teste",
          companyId: FAKE_COMPANY_ID,
          planTier: "TIER_II",
          isMaster: false,
        },
        "test-secret",
        { expiresIn: "7d" }
      );

      const decoded = jwt.decode(token) as any;

      expect(decoded).toHaveProperty("id");
      expect(decoded).toHaveProperty("role");
      expect(decoded).toHaveProperty("name");
      expect(decoded).toHaveProperty("email");
      expect(decoded).toHaveProperty("companyName");
      expect(decoded).toHaveProperty("companyId");
      expect(decoded).toHaveProperty("planTier");
      expect(decoded).toHaveProperty("isMaster");

      expect(decoded).not.toHaveProperty("password");
      expect(decoded).not.toHaveProperty("cpf");
      expect(decoded).not.toHaveProperty("faceDescriptor");
      expect(decoded).not.toHaveProperty("companyId" + "2");
    });
  });
});

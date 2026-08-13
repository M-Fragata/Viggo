import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockExtendedPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  company: { findUnique: vi.fn(), update: vi.fn() },
  checkIn: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

vi.mock("../../../utils/environment.js", () => ({
  Env: { JWT_SECRET: "test-secret-key-for-testing" },
}));

vi.mock("../../../utils/faceEncryption.js", () => ({
  decryptFaceDescriptor: vi.fn().mockReturnValue(new Float32Array(128).fill(0.5)),
  encryptFaceDescriptor: vi.fn().mockReturnValue("encrypted-descriptor"),
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("52998224725"),
  formatCpfDigits: vi.fn().mockReturnValue("52998224725"),
}));

vi.mock("../../../utils/comprovanteGenerator.js", () => ({
  gerarComprovante: vi.fn().mockReturnValue({
    texto: "Comprovante de Ponto\nNSR: 000001\nHASH: a".repeat(6),
    hashVerificacao: "abc123",
  }),
}));

vi.mock("../../../utils/nsrGenerator.js", () => ({
  getNextNSR: vi.fn().mockResolvedValue(1),
  currentYear: vi.fn().mockReturnValue(2026),
  NsrLimitExceededError: class NsrLimitExceededError extends Error {},
}));

vi.mock("../../../utils/toleranceCalculator.js", () => ({
  aplicarTolerancia: vi.fn().mockReturnValue({ horarioEfetivo: new Date(), dentroDaTolerancia: true, minutosExcedentes: 0 }),
  minutosParaDate: vi.fn().mockReturnValue(new Date()),
  tipoParaHorarioPrevisto: vi.fn().mockReturnValue(480),
  tipoParaTolerancia: vi.fn().mockReturnValue(5),
  isDiaUtil: vi.fn().mockReturnValue(false),
}));

vi.mock("bcrypt", () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn() },
}));

import { TotemController } from "../../../controller/TotemController.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getNextNSR, NsrLimitExceededError } from "../../../utils/nsrGenerator.js";
import { gerarComprovante } from "../../../utils/comprovanteGenerator.js";
import { decryptFaceDescriptor } from "../../../utils/faceEncryption.js";

describe("TotemController", () => {
  let controller: TotemController;
  let req: any;
  let res: any;

  const EMPLOYEE_ID = "550e8400-e29b-41d4-a716-446655440001";
  const OTHER_EMPLOYEE_ID = "550e8400-e29b-41d4-a716-446655440002";
  const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440010";
  const OTHER_COMPANY_ID = "550e8400-e29b-41d4-a716-446655440020";

  const mockEmployee = {
    id: EMPLOYEE_ID,
    name: "Funcionário Teste",
    email: "func@test.com",
    password: "hashed-password",
    companyId: COMPANY_ID,
    faceDescriptor: "encrypted-descriptor",
    status: "ACTIVE",
    cpf: "encrypted-cpf",
  };

  const mockEmployeeNoFace = {
    ...mockEmployee,
    faceDescriptor: null,
  };

  const mockCompany = { cnpj: "11222333000181", name: "Empresa Teste" };

  function makeFaceToken(): Promise<string> {
    return new Promise((resolve) => {
      (bcrypt.compare as any).mockResolvedValue(true);
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockEmployee);
      const verifyReq: any = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "func@test.com", password: "TestPassword123!" },
      };
      const verifyRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn((body: any) => resolve(body.faceToken)),
      };
      controller.verify(verifyReq, verifyRes);
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExtendedPrisma.user.findUnique = vi.fn();
    mockExtendedPrisma.user.update = vi.fn();
    mockExtendedPrisma.company.findUnique = vi.fn();
    mockExtendedPrisma.company.update = vi.fn();
    mockExtendedPrisma.checkIn.findFirst = vi.fn();
    mockExtendedPrisma.$transaction = vi.fn();
    (bcrypt.hash as any) = vi.fn().mockResolvedValue("hashed-pin");
    (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
    (jwt.sign as any) = vi.fn().mockReturnValue("totem-token-mock");
    (decryptFaceDescriptor as any) = vi.fn().mockReturnValue(new Float32Array(128).fill(0.5));
    controller = new TotemController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("activate", () => {
    it("deve ativar totem e retornar token com TTL 8h", async () => {
      req = { user: { companyId: COMPANY_ID }, body: { pin: "123456" } };

      await controller.activate(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
      expect(mockExtendedPrisma.company.update).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        data: { totemPinHash: "hashed-pin", totemActive: true },
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { companyId: COMPANY_ID, totem: true },
        "test-secret-key-for-testing",
        { expiresIn: 8 * 60 * 60, algorithm: "HS256" }
      );
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ totemToken: "totem-token-mock", expiresIn: 8 * 60 * 60 });
    });

    it("deve rejeitar PIN não numérico", async () => {
      req = { user: { companyId: COMPANY_ID }, body: { pin: "abcd" } };

      await controller.activate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockExtendedPrisma.company.update).not.toHaveBeenCalled();
    });

    it("deve rejeitar PIN com menos de 4 dígitos", async () => {
      req = { user: { companyId: COMPANY_ID }, body: { pin: "123" } };

      await controller.activate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve rejeitar PIN com mais de 6 dígitos", async () => {
      req = { user: { companyId: COMPANY_ID }, body: { pin: "1234567" } };

      await controller.activate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 403 quando não há companyId no token", async () => {
      req = { user: {}, body: { pin: "1234" } };

      await controller.activate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockExtendedPrisma.company.update).not.toHaveBeenCalled();
    });
  });

  describe("deactivate", () => {
    it("deve desativar totem com PIN correto", async () => {
      mockExtendedPrisma.company.findUnique.mockResolvedValue({
        totemPinHash: "hashed-pin",
        totemActive: true,
      });
      req = { user: { companyId: COMPANY_ID }, body: { pin: "1234" } };

      await controller.deactivate(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith("1234", "hashed-pin");
      expect(mockExtendedPrisma.company.update).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        data: { totemActive: false },
      });
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "Modo totem desativado" });
    });

    it("deve retornar 403 com PIN incorreto", async () => {
      mockExtendedPrisma.company.findUnique.mockResolvedValue({
        totemPinHash: "hashed-pin",
        totemActive: true,
      });
      (bcrypt.compare as any).mockResolvedValue(false);
      req = { user: { companyId: COMPANY_ID }, body: { pin: "0000" } };

      await controller.deactivate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "PIN incorreto" });
      expect(mockExtendedPrisma.company.update).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando totem não configurado", async () => {
      mockExtendedPrisma.company.findUnique.mockResolvedValue(null);
      req = { user: { companyId: COMPANY_ID }, body: { pin: "1234" } };

      await controller.deactivate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Modo totem não está configurado" });
    });

    it("deve retornar 403 sem companyId", async () => {
      req = { user: {}, body: { pin: "1234" } };

      await controller.deactivate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 400 com PIN inválido", async () => {
      req = { user: { companyId: COMPANY_ID }, body: { pin: "12x4" } };

      await controller.deactivate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("recover", () => {
    const mockAdmin = {
      id: "admin-id",
      email: "admin@test.com",
      password: "hashed-admin-password",
      role: "ENTERPRISE_ADMIN",
      companyId: COMPANY_ID,
      status: "ACTIVE",
    };

    const mockMaster = {
      id: "master-id",
      email: "master@test.com",
      password: "hashed-master-password",
      role: "MASTER",
      companyId: null,
      status: "ACTIVE",
    };

    const mockOtherCompanyAdmin = {
      ...mockAdmin,
      email: "admin-outro@test.com",
      companyId: OTHER_COMPANY_ID,
    };

    const mockEmployeeAdmin = {
      ...mockAdmin,
      role: "EMPLOYEE",
    };

    it("deve desativar totem com credenciais de admin da mesma empresa", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as any).mockResolvedValue(true);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "admin@test.com", password: "AdminPassword123!" },
      };

      await controller.recover(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith("AdminPassword123!", "hashed-admin-password");
      expect(mockExtendedPrisma.company.update).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        data: { totemActive: false },
      });
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "Modo totem desativado" });
    });

    it("deve permitir MASTER recuperar totem", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockMaster);
      (bcrypt.compare as any).mockResolvedValue(true);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "master@test.com", password: "MasterPassword123!" },
      };

      await controller.recover(req, res);

      expect(mockExtendedPrisma.company.update).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        data: { totemActive: false },
      });
    });

    it("deve retornar 403 para admin de outra empresa", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockOtherCompanyAdmin);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "admin-outro@test.com", password: "AdminPassword123!" },
      };

      await controller.recover(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockExtendedPrisma.company.update).not.toHaveBeenCalled();
    });

    it("deve retornar 403 para funcionário comum", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockEmployeeAdmin);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "func@test.com", password: "AdminPassword123!" },
      };

      await controller.recover(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 403 com senha incorreta", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as any).mockResolvedValue(false);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "admin@test.com", password: "senha-errada" },
      };

      await controller.recover(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockExtendedPrisma.company.update).not.toHaveBeenCalled();
    });

    it("deve retornar 403 quando usuário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "naoexiste@test.com", password: "AdminPassword123!" },
      };

      await controller.recover(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 403 sem contexto de totem", async () => {
      req = {
        body: { email: "admin@test.com", password: "AdminPassword123!" },
      };

      await controller.recover(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 400 com dados inválidos", async () => {
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "email-invalido", password: "123" },
      };

      await controller.recover(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("verify", () => {
    it("deve emitir faceToken para funcionário válido com face cadastrada", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockEmployee);
      (bcrypt.compare as any).mockResolvedValue(true);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "func@test.com", password: "TestPassword123!" },
      };

      await controller.verify(req, res);

      expect(res.status).not.toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveProperty("faceToken");
      expect(payload).toHaveProperty("expiresIn", 30);
      expect(payload.userId).toBe(EMPLOYEE_ID);
      expect(payload.userName).toBe("Funcionário Teste");
    });

    it("deve retornar 404 quando funcionário não pertence à empresa do totem", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        ...mockEmployee,
        companyId: OTHER_COMPANY_ID,
      });
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "func@test.com", password: "TestPassword123!" },
      };

      await controller.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 404 quando funcionário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "naoexiste@test.com", password: "TestPassword123!" },
      };

      await controller.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 403 para conta inativa", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        ...mockEmployee,
        status: "INACTIVE",
      });
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "func@test.com", password: "TestPassword123!" },
      };

      await controller.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 403 com senha incorreta", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockEmployee);
      (bcrypt.compare as any).mockResolvedValue(false);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "func@test.com", password: "senha-errada" },
      };

      await controller.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Credenciais inválidas" });
    });

    it("deve retornar 403 FACE_NOT_REGISTERED quando funcionário não tem face", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(mockEmployeeNoFace);
      (bcrypt.compare as any).mockResolvedValue(true);
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "func@test.com", password: "TestPassword123!" },
      };

      await controller.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "FACE_NOT_REGISTERED", userId: EMPLOYEE_ID })
      );
    });

    it("deve retornar 403 sem contexto de totem", async () => {
      req = {
        body: { email: "func@test.com", password: "TestPassword123!" },
      };

      await controller.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 400 com dados inválidos", async () => {
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { email: "email-invalido", password: "123" },
      };

      await controller.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("checkin", () => {
    it("deve registrar ponto com faceToken válido e comprovante", async () => {
      const faceToken = await makeFaceToken();
      mockExtendedPrisma.user.findUnique
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce({ ...mockEmployee, workSchedule: null });
      mockExtendedPrisma.checkIn.findFirst.mockResolvedValue(null);
      mockExtendedPrisma.company.findUnique.mockResolvedValue(mockCompany);
      mockExtendedPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          checkIn: {
            create: vi.fn().mockResolvedValue({
              id: "checkin-1",
              nsr: 1,
              ano: 2026,
              type: "ENTRY",
              createdAt: new Date(),
              latitude: -23.55,
              longitude: -46.63,
            }),
          },
        })
      );

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          comprovante: expect.any(String),
          hashVerificacao: expect.any(String),
          checkin: expect.anything(),
        })
      );
      expect(gerarComprovante).toHaveBeenCalled();
    });

    it("deve rejeitar faceToken inválido", async () => {
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken: crypto.randomUUID(),
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockExtendedPrisma.checkIn.findFirst).not.toHaveBeenCalled();
    });

    it("deve rejeitar faceToken expirado", async () => {
      vi.useFakeTimers();
      const faceToken = await makeFaceToken();
      vi.advanceTimersByTime(31_000);

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      vi.useRealTimers();
    });

    it("deve rejeitar faceToken de outro usuário (403)", async () => {
      const faceToken = await makeFaceToken();

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: OTHER_EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 404 quando usuário não pertence à empresa", async () => {
      const faceToken = await makeFaceToken();
      mockExtendedPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockEmployee,
        companyId: OTHER_COMPANY_ID,
      });

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve bloquear checkin duplicado no mesmo dia", async () => {
      const faceToken = await makeFaceToken();
      mockExtendedPrisma.user.findUnique.mockResolvedValueOnce(mockEmployee);
      mockExtendedPrisma.checkIn.findFirst.mockResolvedValue({ id: "existing" });

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("já registrado hoje") })
      );
    });

    it("deve retornar 400 com type inválido", async () => {
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: EMPLOYEE_ID,
          type: "INVALID",
          latitude: -23.55,
          longitude: -46.63,
          faceToken: crypto.randomUUID(),
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 403 sem contexto de totem", async () => {
      req = {
        body: {
          userId: EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken: crypto.randomUUID(),
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deve retornar 503 quando limite de NSR é atingido", async () => {
      const faceToken = await makeFaceToken();
      mockExtendedPrisma.user.findUnique
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce({ ...mockEmployee, workSchedule: null });
      mockExtendedPrisma.checkIn.findFirst.mockResolvedValue(null);
      mockExtendedPrisma.company.findUnique.mockResolvedValue(mockCompany);
      mockExtendedPrisma.$transaction.mockImplementation(async (fn: any) => fn({
        checkIn: { create: vi.fn() },
      }));
      (getNextNSR as any).mockRejectedValue(new (NsrLimitExceededError as any)("limite"));

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: {
          userId: EMPLOYEE_ID,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        },
      };

      await controller.checkin(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe("verifyFace", () => {
    it("deve validar descriptor facial com distância menor que threshold", async () => {
      const faceToken = await makeFaceToken();

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { token: faceToken, descriptor: Array.from(new Float32Array(128).fill(0.5)) },
      };

      await controller.verifyFace(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("deve retornar success false quando rosto não reconhecido", async () => {
      const faceToken = await makeFaceToken();

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { token: faceToken, descriptor: Array.from(new Float32Array(128).fill(1.0)) },
      };

      await controller.verifyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Rosto não reconhecido" })
      );
    });

    it("deve retornar 401 com token inválido", async () => {
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { token: crypto.randomUUID(), descriptor: Array.from(new Float32Array(128).fill(0.5)) },
      };

      await controller.verifyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("deve retornar 400 com descriptor de tamanho inválido", async () => {
      const faceToken = await makeFaceToken();

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { token: faceToken, descriptor: [1, 2, 3] },
      };

      await controller.verifyFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("registerFace", () => {
    const descriptor = Array.from(new Float32Array(128).fill(0.5));

    it("deve registrar descriptor facial com sucesso", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: EMPLOYEE_ID,
        companyId: COMPANY_ID,
      });

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { userId: EMPLOYEE_ID, descriptor },
      };

      await controller.registerFace(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "Face registrada com sucesso!" });
      expect(mockExtendedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EMPLOYEE_ID },
          data: expect.objectContaining({ faceDescriptor: "encrypted-descriptor" }),
        })
      );
    });

    it("deve retornar 404 quando usuário não pertence à empresa do totem", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue({
        id: OTHER_EMPLOYEE_ID,
        companyId: OTHER_COMPANY_ID,
      });

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { userId: OTHER_EMPLOYEE_ID, descriptor },
      };

      await controller.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Funcionário não encontrado nesta empresa" });
      expect(mockExtendedPrisma.user.update).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando usuário não existe", async () => {
      mockExtendedPrisma.user.findUnique.mockResolvedValue(null);

      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { userId: EMPLOYEE_ID, descriptor },
      };

      await controller.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(mockExtendedPrisma.user.update).not.toHaveBeenCalled();
    });

    it("deve retornar 400 com descriptor de tamanho inválido", async () => {
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { userId: EMPLOYEE_ID, descriptor: [1, 2, 3] },
      };

      await controller.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockExtendedPrisma.user.update).not.toHaveBeenCalled();
    });

    it("deve retornar 400 com userId inválido", async () => {
      req = {
        totemContext: { companyId: COMPANY_ID },
        body: { userId: "nao-e-uuid", descriptor },
      };

      await controller.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 403 sem contexto de totem", async () => {
      req = {
        body: { userId: EMPLOYEE_ID, descriptor },
      };

      await controller.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockExtendedPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});

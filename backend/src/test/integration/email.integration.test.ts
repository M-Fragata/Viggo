import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createTestApp } from "../helpers/testApp.js";
import { prisma } from "../../database/prisma.js";
import { createTestCompany, cleanupTestData, type TestDataContext } from "../helpers/authHelper.js";
import { Env } from "../../utils/environment.js";
import * as emailService from "../../services/email/emailService.js";

const app = createTestApp();

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

describe("email integration — Forgot Password + emailService (usa DATABASE_URL do .env DEV)", () => {
  let ctx: TestDataContext;
  let savedEnv: Record<string, unknown>;

  beforeAll(async () => {
    ctx = await createTestCompany(prisma, `email-int-${Date.now()}`);
    // salvar Env original
    savedEnv = { ...Env } as Record<string, unknown>;
  });

  afterAll(async () => {
    // restaurar Env
    Object.assign(Env, savedEnv);
    emailService.resetEmailProvider();
    await cleanupTestData(prisma, ctx.companyId);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /auth/forgot-password", () => {
    it("deve retornar sucesso mesmo para email inexistente (não vaza existência)", async () => {
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: `naoexiste-${Date.now()}@test.com` });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Se o email existir");
    });

    it("deve rejeitar email inválido com 400", async () => {
      const res = await request(app).post("/auth/forgot-password").send({ email: "invalido" });
      expect(res.status).toBe(400);
    });

    it("deve gerar resetCode hash + expiração no DB para email existente (sem enviar email real, NODE_ENV=TEST)", async () => {
      // garantir que está em TEST (email desabilitado) — comportamento prod é skip mas DB muda
      (Env as Record<string, unknown>).NODE_ENV = "TEST";
      (Env as Record<string, unknown>).EMAIL_ENABLED = true;
      const mockProvider = { send: vi.fn().mockResolvedValue({ id: "mock" }) };
      emailService.setEmailProvider(mockProvider);

      const res = await request(app).post("/auth/forgot-password").send({ email: ctx.adminEmail });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(ctx.adminEmail);

      const user = await prisma.user.findUnique({ where: { email: ctx.adminEmail } });
      expect(user?.resetCode).toBeTruthy();
      expect(user?.resetCode).toHaveLength(64); // sha256 hex
      expect(user?.resetCodeExpiresAt).toBeInstanceOf(Date);
      expect(user?.resetCodeAttempts).toBe(0);
      // em TEST o provider não deve ser chamado (isEmailEnabled false)
      expect(mockProvider.send).not.toHaveBeenCalled();
    });

    it("deve chamar provider quando NODE_ENV=PROD e EMAIL_ENABLED=true", async () => {
      (Env as Record<string, unknown>).NODE_ENV = "PROD";
      (Env as Record<string, unknown>).EMAIL_ENABLED = true;
      (Env as Record<string, unknown>).EMAIL_PREVIEW = false;
      (Env as Record<string, unknown>).RESEND_API_KEY = "re_test_key";
      (Env as Record<string, unknown>).EMAIL_TEST_TO = undefined;
      const mockProvider = { send: vi.fn().mockResolvedValue({ id: "mock-prod" }) };
      emailService.setEmailProvider(mockProvider);

      const res = await request(app).post("/auth/forgot-password").send({ email: ctx.adminEmail });
      expect(res.status).toBe(200);
      // em PROD com mock, o email é disparado async via void — dá um tick
      await new Promise((r) => setTimeout(r, 50));
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
      const call = mockProvider.send.mock.calls[0]![0] as Record<string, unknown>;
      expect(call.to).toEqual([ctx.adminEmail]);
      expect(call.subject).toContain("Código");

      // restaurar para TEST para não afetar outros testes
      (Env as Record<string, unknown>).NODE_ENV = "TEST";
    });
  });

  describe("POST /auth/verify-reset-code", () => {
    it("deve rejeitar código inválido e incrementar tentativas", async () => {
      (Env as Record<string, unknown>).NODE_ENV = "TEST";
      await request(app).post("/auth/forgot-password").send({ email: ctx.adminEmail });
      const userBefore = await prisma.user.findUnique({ where: { email: ctx.adminEmail } });
      const attemptsBefore = userBefore?.resetCodeAttempts ?? 0;

      const res = await request(app)
        .post("/auth/verify-reset-code")
        .send({ email: ctx.adminEmail, code: "000000" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Código inválido");

      const userAfter = await prisma.user.findUnique({ where: { email: ctx.adminEmail } });
      expect((userAfter?.resetCodeAttempts ?? 0)).toBe(attemptsBefore + 1);
    });

    it("deve aceitar código correto e retornar token JWT", async () => {
      // gerar novo código e capturar hash via DB, mas precisamos do code plain
      // então geramos um código conhecido e setamos direto no DB
      const plainCode = "123456";
      await prisma.user.update({
        where: { email: ctx.adminEmail },
        data: {
          resetCode: hashCode(plainCode),
          resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          resetCodeAttempts: 0,
        },
      });

      const res = await request(app)
        .post("/auth/verify-reset-code")
        .send({ email: ctx.adminEmail, code: plainCode });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      const payload = jwt.verify(res.body.token, process.env.JWT_SECRET!) as { userId: string; type: string };
      expect(payload.type).toBe("password-reset");
    });

    it("deve rejeitar após 5 tentativas", async () => {
      await prisma.user.update({
        where: { email: ctx.adminEmail },
        data: {
          resetCode: hashCode("999999"),
          resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          resetCodeAttempts: 5,
        },
      });
      const res = await request(app)
        .post("/auth/verify-reset-code")
        .send({ email: ctx.adminEmail, code: "999999" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("máximo de tentativas");
    });

    it("deve rejeitar código expirado", async () => {
      await prisma.user.update({
        where: { email: ctx.adminEmail },
        data: {
          resetCode: hashCode("111111"),
          resetCodeExpiresAt: new Date(Date.now() - 1000),
          resetCodeAttempts: 0,
        },
      });
      const res = await request(app)
        .post("/auth/verify-reset-code")
        .send({ email: ctx.adminEmail, code: "111111" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("expirado");
    });

    it("deve rejeitar body inválido (code sem 6 dígitos)", async () => {
      const res = await request(app)
        .post("/auth/verify-reset-code")
        .send({ email: ctx.adminEmail, code: "123" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("deve redefinir senha e limpar resetCode", async () => {
      const plainCode = "654321";
      await prisma.user.update({
        where: { email: ctx.adminEmail },
        data: {
          resetCode: hashCode(plainCode),
          resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          resetCodeAttempts: 0,
        },
      });
      const verify = await request(app)
        .post("/auth/verify-reset-code")
        .send({ email: ctx.adminEmail, code: plainCode });
      expect(verify.status).toBe(200);
      const token = verify.body.token as string;

      const newPassword = "NewPass123!";
      const res = await request(app).post("/auth/reset-password").send({ token, password: newPassword });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Senha redefinida");

      const user = await prisma.user.findUnique({ where: { email: ctx.adminEmail } });
      expect(user?.resetCode).toBeNull();
      expect(user?.resetCodeExpiresAt).toBeNull();
      // senha deve bater com bcrypt
      const ok = await bcrypt.compare(newPassword, user!.password);
      expect(ok).toBe(true);
    });

    it("deve rejeitar token inválido", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ token: "invalid.token.here", password: "AnyPass123!" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Token inválido");
    });

    it("deve rejeitar senha curta", async () => {
      const fakeToken = jwt.sign({ userId: ctx.adminId, type: "password-reset" }, process.env.JWT_SECRET!, { expiresIn: "5m" });
      const res = await request(app).post("/auth/reset-password").send({ token: fakeToken, password: "short" });
      expect(res.status).toBe(400);
    });
  });

  describe("emailService via HTTP — signup dispara welcome (fire-and-forget)", () => {
    it("POST /companies/signup deve criar empresa mesmo quando email desabilitado", async () => {
      (Env as Record<string, unknown>).NODE_ENV = "TEST";
      const ts = Date.now();
      const email = `signup-email-${ts}@test.com`;
      // gerar CNPJ/CPF válidos com checksum correto para passar validação e evitar colisão em Neon
      function generateValidCnpj(): string {
        const base = Math.floor(Math.random() * 1e8).toString().padStart(8, "0") + "0001";
        const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        let sum = 0;
        for (let i = 0; i < 12; i++) sum += parseInt(base[i]!) * w1[i]!;
        let d1 = sum % 11;
        d1 = d1 < 2 ? 0 : 11 - d1;
        const withD1 = base + d1;
        const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        sum = 0;
        for (let i = 0; i < 13; i++) sum += parseInt(withD1[i]!) * w2[i]!;
        let d2 = sum % 11;
        d2 = d2 < 2 ? 0 : 11 - d2;
        return withD1 + d2;
      }
      function generateValidCpf(): string {
        const n = () => Math.floor(Math.random() * 10);
        const base = Array.from({ length: 9 }, n);
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += base[i]! * (10 - i);
        let d1 = 11 - (sum % 11);
        if (d1 >= 10) d1 = 0;
        sum = 0;
        for (let i = 0; i < 9; i++) sum += base[i]! * (11 - i);
        sum += d1 * 2;
        let d2 = 11 - (sum % 11);
        if (d2 >= 10) d2 = 0;
        const cpf = [...base, d1, d2].join("");
        // evitar sequências repetidas
        if (/^(\d)\1{10}$/.test(cpf)) return generateValidCpf();
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      }
      const cnpj = generateValidCnpj();
      const cpf = generateValidCpf();
      const res = await request(app)
        .post("/companies/signup")
        .send({
          name: "Signup Email Test",
          email,
          cpf,
          cnpj,
          companyName: `Empresa Email ${ts}`,
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: true,
          aceiteDpa: true,
        });
      if (res.status !== 201) console.error("signup failed", res.body);
      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      // limpar — ordem respeitando FKs
      await prisma.checkIn.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.justificativa.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.inviteTokenUsage.deleteMany({ where: { inviteToken: { companyId: res.body.company.id } } });
      await prisma.inviteToken.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.consentimento.deleteMany({ where: { user: { companyId: res.body.company.id } } });
      await prisma.auditLog.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.workSchedule.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.subscription.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.payment.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.user.deleteMany({ where: { companyId: res.body.company.id } });
      await prisma.company.delete({ where: { id: res.body.company.id } });
    });
  });
});

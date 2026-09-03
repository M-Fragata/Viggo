import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// mutable mock env - vi.mock por teste (requisito 1) — usar vi.hoisted para evitar hoisting error
const mockEnv = vi.hoisted(() => ({
  EMAIL_ENABLED: true,
  NODE_ENV: "PROD",
  EMAIL_PREVIEW: false,
  EMAIL_TEST_TO: undefined as unknown,
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "Ponto Fragata <noreply@fragata.me>",
  EMAIL_REPLY_TO: undefined as unknown,
  FRONTEND_URL: "http://localhost:3000",
}) as Record<string, unknown>);

vi.mock("../../../../utils/environment.js", () => ({
  Env: mockEnv,
}));

// mock templates to isolate service logic and speed up tests
vi.mock("../../../../templates/welcomeCompany.js", () => ({
  renderWelcomeCompany: vi.fn(() => ({ subject: "Bem-vindo", html: "<html>welcome</html>", text: "welcome text" })),
}));
vi.mock("../../../../templates/trialEnding.js", () => ({
  renderTrialEnding: vi.fn(() => ({ subject: "Trial ending", html: "<html>trial</html>", text: "trial text" })),
}));
vi.mock("../../../../templates/paymentConfirmed.js", () => ({
  renderPaymentConfirmed: vi.fn(() => ({ subject: "Pagamento confirmado", html: "<html>confirmed</html>", text: "confirmed text" })),
}));
vi.mock("../../../../templates/paymentOverdue.js", () => ({
  renderPaymentOverdue: vi.fn(() => ({ subject: "Pagamento atrasado", html: "<html>overdue</html>", text: "overdue text" })),
}));
vi.mock("../../../../templates/justificativaCreated.js", () => ({
  renderJustificativaCreated: vi.fn(() => ({ subject: "Justificativa criada", html: "<html>created</html>", text: "created text" })),
}));
vi.mock("../../../../templates/justificativaDecided.js", () => ({
  renderJustificativaDecided: vi.fn(() => ({ subject: "Justificativa decidida", html: "<html>decided</html>", text: "decided text" })),
}));
vi.mock("../../../../templates/biometricExpiring.js", () => ({
  renderBiometricExpiring: vi.fn(() => ({ subject: "Biometria expirando", html: "<html>expiring</html>", text: "expiring text" })),
}));
vi.mock("../../../../templates/resetPassword.js", () => ({
  renderResetPassword: vi.fn(() => ({ subject: "Código de redefinição", html: "<html>reset</html>", text: "reset text" })),
}));
vi.mock("../../../../templates/employeeWelcome.js", () => ({
  renderEmployeeWelcome: vi.fn(() => ({ subject: "Bem-vindo employee", html: "<html>employee</html>", text: "employee text" })),
}));
vi.mock("../../../../templates/biometricPurged.js", () => ({
  renderBiometricPurged: vi.fn(() => ({ subject: "Biometria removida", html: "<html>purged</html>", text: "purged text" })),
}));
vi.mock("../../../../templates/paymentUpcoming.js", () => ({
  renderPaymentUpcoming: vi.fn(() => ({ subject: "Pagamento próximo", html: "<html>upcoming</html>", text: "upcoming text" })),
}));
vi.mock("../../../../templates/subscriptionCancelled.js", () => ({
  renderSubscriptionCancelled: vi.fn(() => ({ subject: "Assinatura cancelada", html: "<html>cancelled</html>", text: "cancelled text" })),
}));

import * as emailService from "../../../../services/email/emailService.js";
import type { EmailProvider } from "../../../../services/email/emailProvider.js";

function createMockProvider(): EmailProvider & { send: ReturnType<typeof vi.fn> } {
  return {
    send: vi.fn().mockResolvedValue({ id: "mock-id-123" }),
  };
}

describe("emailService", () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    // reset to defaults
    mockEnv.EMAIL_ENABLED = true;
    mockEnv.NODE_ENV = "PROD";
    mockEnv.EMAIL_PREVIEW = false;
    mockEnv.EMAIL_TEST_TO = undefined;
    mockEnv.RESEND_API_KEY = "test-resend-key";
    mockEnv.EMAIL_FROM = "Ponto Fragata <noreply@fragata.me>";
    mockEnv.EMAIL_REPLY_TO = undefined;
    mockProvider = createMockProvider();
    emailService.setEmailProvider(mockProvider);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    emailService.resetEmailProvider();
  });

  describe("isEmailEnabled / EMAIL_ENABLED", () => {
    it("deve retornar null quando EMAIL_ENABLED=false (skip)", async () => {
      mockEnv.EMAIL_ENABLED = false;
      const result = await emailService.sendWelcomeCompany({
        to: "user@test.com",
        adminName: "Admin",
        companyName: "Acme",
        trialExpiresAt: new Date(),
      });
      expect(result).toBeNull();
      expect(mockProvider.send).not.toHaveBeenCalled();
    });

    it("deve retornar null quando NODE_ENV=TEST (desabilita em testes)", async () => {
      mockEnv.NODE_ENV = "TEST";
      const result = await emailService.sendResetPassword({ to: "a@test.com", code: "123456" });
      expect(result).toBeNull();
      expect(mockProvider.send).not.toHaveBeenCalled();
    });

    it("deve enviar quando habilitado e NODE_ENV=PROD", async () => {
      mockEnv.NODE_ENV = "PROD";
      mockEnv.EMAIL_ENABLED = true;
      const result = await emailService.sendResetPassword({ to: "a@test.com", code: "123456" });
      expect(result).toEqual({ id: "mock-id-123" });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("EMAIL_PREVIEW", () => {
    it("deve retornar preview sem chamar provider quando EMAIL_PREVIEW=true", async () => {
      mockEnv.EMAIL_PREVIEW = true;
      const result = await emailService.sendWelcomeCompany({
        to: "x@test.com",
        adminName: "Admin",
        companyName: "Acme",
        trialExpiresAt: new Date(),
      });
      expect(result).toEqual({ id: "preview" });
      expect(mockProvider.send).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[Email PREVIEW]"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("<html>welcome</html>"));
    });
  });

  describe("RESEND_API_KEY ausente", () => {
    it("deve retornar null e warn quando RESEND_API_KEY ausente", async () => {
      mockEnv.RESEND_API_KEY = undefined;
      const result = await emailService.sendWelcomeCompany({
        to: "x@test.com",
        adminName: "Admin",
        companyName: "Acme",
        trialExpiresAt: new Date(),
      });
      expect(result).toBeNull();
      expect(mockProvider.send).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("RESEND_API_KEY missing"));
    });
  });

  describe("resolveTo / EMAIL_TEST_TO", () => {
    it("deve redirecionar para EMAIL_TEST_TO quando definido", async () => {
      mockEnv.EMAIL_TEST_TO = "redirect@test.com";
      await emailService.sendWelcomeCompany({
        to: "original@test.com",
        adminName: "Admin",
        companyName: "Acme",
        trialExpiresAt: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["redirect@test.com"] })
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[Email] Redirect"));
    });

    it("deve redirecionar array de destinatários para EMAIL_TEST_TO", async () => {
      mockEnv.EMAIL_TEST_TO = "redirect@test.com";
      await emailService.sendTrialEnding({
        to: ["a@test.com", "b@test.com"],
        companyName: "Acme",
        daysRemaining: 3,
        planExpiresAt: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["redirect@test.com"] })
      );
    });

    it("deve manter destinatário original quando EMAIL_TEST_TO vazio", async () => {
      mockEnv.EMAIL_TEST_TO = "";
      await emailService.sendResetPassword({ to: "keep@test.com", code: "123456" });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["keep@test.com"] })
      );
    });

    it("deve manter array original quando EMAIL_TEST_TO undefined", async () => {
      mockEnv.EMAIL_TEST_TO = undefined;
      await emailService.sendPaymentConfirmed({
        to: ["a@test.com", "b@test.com"],
        companyName: "Acme",
        amount: 100,
        billingType: "PIX",
        paidAt: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["a@test.com", "b@test.com"] })
      );
    });

    it("deve trim EMAIL_TEST_TO com espaços", async () => {
      mockEnv.EMAIL_TEST_TO = "  trim@test.com  ";
      await emailService.sendResetPassword({ to: "orig@test.com", code: "123456" });
      // o service faz .trim(), então envia sem espaços
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["trim@test.com"] })
      );
    });
  });

  describe("buildOpts / replyTo", () => {
    it("deve injetar replyTo quando EMAIL_REPLY_TO definido", async () => {
      mockEnv.EMAIL_REPLY_TO = "suporte@fragata.me";
      await emailService.sendResetPassword({ to: "a@test.com", code: "123456" });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: "suporte@fragata.me" })
      );
    });

    it("não deve injetar replyTo quando EMAIL_REPLY_TO undefined", async () => {
      mockEnv.EMAIL_REPLY_TO = undefined;
      await emailService.sendResetPassword({ to: "a@test.com", code: "123456" });
      const opts = mockProvider.send.mock.calls[0]![0] as Record<string, unknown>;
      expect(opts.replyTo).toBeUndefined();
    });

    it("deve trim replyTo com espaços", async () => {
      mockEnv.EMAIL_REPLY_TO = "  reply@test.com  ";
      await emailService.sendResetPassword({ to: "a@test.com", code: "123456" });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: "reply@test.com" })
      );
    });

    it("não deve injetar replyTo quando EMAIL_REPLY_TO vazio após trim", async () => {
      mockEnv.EMAIL_REPLY_TO = "   ";
      await emailService.sendResetPassword({ to: "a@test.com", code: "123456" });
      const opts = mockProvider.send.mock.calls[0]![0] as Record<string, unknown>;
      expect(opts.replyTo).toBeUndefined();
    });
  });

  describe("tratamento de erro do provider", () => {
    it("deve propagar erro e logar quando provider falha", async () => {
      mockProvider.send.mockRejectedValue(new Error("Resend down"));
      await expect(emailService.sendResetPassword({ to: "a@test.com", code: "123456" })).rejects.toThrow("Resend down");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[Email] Failed"), expect.any(Error));
    });

    it("deve logar sucesso com id", async () => {
      mockProvider.send.mockResolvedValue({ id: "abc-123" });
      await emailService.sendResetPassword({ to: "a@test.com", code: "999999" });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[Email] Sent"));
    });
  });

  describe("métodos públicos — sanitários", () => {
    it("sendWelcomeCompany deve usar EMAIL_FROM e render", async () => {
      mockEnv.EMAIL_FROM = "Ponto Fragata <noreply@fragata.me>";
      await emailService.sendWelcomeCompany({
        to: "admin@test.com",
        adminName: "João",
        companyName: "Acme",
        trialExpiresAt: new Date("2026-09-30"),
      });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Ponto Fragata <noreply@fragata.me>",
          to: ["admin@test.com"],
          subject: "Bem-vindo",
          html: "<html>welcome</html>",
          text: "welcome text",
        })
      );
    });

    it("sendTrialEnding deve enviar para múltiplos admins", async () => {
      await emailService.sendTrialEnding({
        to: ["a@test.com", "b@test.com"],
        companyName: "Acme",
        daysRemaining: 1,
        planExpiresAt: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["a@test.com", "b@test.com"], subject: "Trial ending" })
      );
    });

    it("sendPaymentConfirmed deve enviar com amount e billingType", async () => {
      await emailService.sendPaymentConfirmed({
        to: "admin@test.com",
        companyName: "Acme",
        amount: 99.9,
        billingType: "PIX",
        paidAt: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it("sendPaymentOverdue deve enviar", async () => {
      await emailService.sendPaymentOverdue({
        to: "admin@test.com",
        companyName: "Acme",
        amount: 50,
        dueDate: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it("sendJustificativaCreated deve enviar para admins", async () => {
      await emailService.sendJustificativaCreated({
        to: ["admin@test.com"],
        employeeName: "Maria",
        tipo: "ATESTADO",
        descricao: "desc",
        dataInicio: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it("sendJustificativaDecided aprovado/reprovado", async () => {
      await emailService.sendJustificativaDecided({
        to: "emp@test.com",
        employeeName: "Maria",
        tipo: "FALTA",
        aprovado: true,
        dataInicio: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
      await emailService.sendJustificativaDecided({
        to: "emp@test.com",
        employeeName: "Maria",
        tipo: "FALTA",
        aprovado: false,
        dataInicio: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(2);
    });

    it("sendBiometricExpiring deve enviar", async () => {
      await emailService.sendBiometricExpiring({
        to: "user@test.com",
        userName: "Carlos",
        expiresAt: new Date(),
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it("sendResetPassword deve enviar código", async () => {
      await emailService.sendResetPassword({ to: "user@test.com", code: "123456" });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "Código de redefinição", html: "<html>reset</html>" })
      );
    });

    it("sendEmployeeWelcome deve enviar", async () => {
      await emailService.sendEmployeeWelcome({
        to: "emp@test.com",
        employeeName: "Ana",
        companyName: "Acme",
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it("sendBiometricPurged deve enviar", async () => {
      await emailService.sendBiometricPurged({ to: "u@test.com", userName: "Bob" });
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it("sendPaymentUpcoming deve enviar 3d e 1d", async () => {
      await emailService.sendPaymentUpcoming({
        to: "a@test.com",
        companyName: "Acme",
        amount: 100,
        dueDate: new Date(),
        daysRemaining: 3,
      });
      await emailService.sendPaymentUpcoming({
        to: "a@test.com",
        companyName: "Acme",
        amount: 100,
        dueDate: new Date(),
        daysRemaining: 1,
      });
      expect(mockProvider.send).toHaveBeenCalledTimes(2);
    });

    it("sendSubscriptionCancelled deve enviar para múltiplos", async () => {
      await emailService.sendSubscriptionCancelled({ to: ["a@test.com", "b@test.com"], companyName: "Acme" });
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["a@test.com", "b@test.com"] })
      );
    });
  });

  describe("setEmailProvider / resetEmailProvider", () => {
    it("deve permitir injetar provider customizado", async () => {
      const custom = createMockProvider();
      custom.send.mockResolvedValue({ id: "custom-id" });
      emailService.setEmailProvider(custom);
      const result = await emailService.sendResetPassword({ to: "x@test.com", code: "000000" });
      expect(result).toEqual({ id: "custom-id" });
      expect(custom.send).toHaveBeenCalledTimes(1);
      expect(mockProvider.send).not.toHaveBeenCalled();
    });
  });
});

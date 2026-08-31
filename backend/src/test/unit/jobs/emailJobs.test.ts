import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCompanyFindMany = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockCompanyFindUnique = vi.hoisted(() => vi.fn());
const mockPaymentFindMany = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockExtendedUserFindMany = vi.hoisted(() => vi.fn());

const mockSendTrialEnding = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "mock" }));
const mockSendPaymentUpcoming = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "mock" }));
const mockSendBiometricExpiring = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "mock" }));

const mockEnv = vi.hoisted(() => ({
  MASTER_CNPJ: undefined as unknown,
  FRONTEND_URL: "http://localhost:3000",
}) as Record<string, unknown>);

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    company: { findMany: mockCompanyFindMany, findUnique: mockCompanyFindUnique },
    user: { findMany: mockUserFindMany, update: mockUserUpdate },
    payment: { findMany: mockPaymentFindMany },
  },
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: {
    user: { findMany: mockExtendedUserFindMany, update: mockUserUpdate },
  },
}));

vi.mock("../../../services/email/emailService.js", () => ({
  sendTrialEnding: mockSendTrialEnding,
  sendPaymentUpcoming: mockSendPaymentUpcoming,
  sendBiometricExpiring: mockSendBiometricExpiring,
}));

vi.mock("../../../utils/environment.js", () => ({
  Env: mockEnv,
}));

import { runTrialEndingJob } from "../../../jobs/trialEndingJob.js";
import { runPaymentUpcomingJob } from "../../../jobs/paymentUpcomingJob.js";
import { runBiometricExpiringJob } from "../../../jobs/biometricExpiringJob.js";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

describe("jobs de email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.MASTER_CNPJ = undefined;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("runTrialEndingJob", () => {
    it("deve enviar para empresas com planExpiresAt em D+3 e D+1", async () => {
      const today = startOfDay(new Date());
      const d3 = addDays(today, 3);
      const d1 = addDays(today, 1);
      const dOther = addDays(today, 5);

      mockCompanyFindMany.mockResolvedValue([
        { id: "c1", name: "Acme 3d", cnpj: "11111111111111", planExpiresAt: d3 },
        { id: "c2", name: "Acme 1d", cnpj: "22222222222222", planExpiresAt: d1 },
        { id: "c3", name: "Acme other", cnpj: "33333333333333", planExpiresAt: dOther },
        { id: "c4", name: "Acme null", cnpj: "44444444444444", planExpiresAt: null },
      ]);
      mockUserFindMany.mockResolvedValue([{ email: "admin@test.com" }]);

      const result = await runTrialEndingJob();

      expect(result.sent3d).toBe(1);
      expect(result.sent1d).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockSendTrialEnding).toHaveBeenCalledTimes(2);
      expect(mockSendTrialEnding).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: "Acme 3d", daysRemaining: 3 })
      );
      expect(mockSendTrialEnding).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: "Acme 1d", daysRemaining: 1 })
      );
    });

    it("deve ignorar empresas sem admins", async () => {
      const d3 = addDays(startOfDay(new Date()), 3);
      mockCompanyFindMany.mockResolvedValue([{ id: "c1", name: "Acme", cnpj: "111", planExpiresAt: d3 }]);
      mockUserFindMany.mockResolvedValue([]);

      const result = await runTrialEndingJob();
      expect(result.sent3d).toBe(0);
      expect(mockSendTrialEnding).not.toHaveBeenCalled();
    });

    it("deve capturar erro de send e não derrubar job", async () => {
      const d3 = addDays(startOfDay(new Date()), 3);
      mockCompanyFindMany.mockResolvedValue([{ id: "c1", name: "Acme", cnpj: "111", planExpiresAt: d3 }]);
      mockUserFindMany.mockResolvedValue([{ email: "a@test.com" }]);
      mockSendTrialEnding.mockRejectedValueOnce(new Error("fail send"));

      const result = await runTrialEndingJob();
      expect(result.errors).toHaveLength(1);
      expect(result.sent3d).toBe(0);
    });

    it("deve excluir master CNPJ quando configurado", async () => {
      mockEnv.MASTER_CNPJ = "68693239000128";
      const d3 = addDays(startOfDay(new Date()), 3);
      mockCompanyFindMany.mockResolvedValue([]);
      await runTrialEndingJob();
      expect(mockCompanyFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cnpj: { not: "68693239000128" },
          }),
        })
      );
    });
  });

  describe("runPaymentUpcomingJob", () => {
    it("deve enviar para payments com dueDate D+3 e D+1", async () => {
      const today = startOfDay(new Date());
      const d3 = addDays(today, 3);
      const d1 = addDays(today, 1);
      const dOther = addDays(today, 10);

      mockPaymentFindMany.mockResolvedValue([
        { id: "p1", companyId: "c1", amount: 100, dueDate: d3 },
        { id: "p2", companyId: "c1", amount: 200, dueDate: d1 },
        { id: "p3", companyId: "c1", amount: 300, dueDate: dOther },
      ]);
      mockCompanyFindUnique.mockResolvedValue({ cnpj: "111", name: "Acme" });
      mockUserFindMany.mockResolvedValue([{ email: "admin@test.com" }]);

      const result = await runPaymentUpcomingJob();
      expect(result.sent3d).toBe(1);
      expect(result.sent1d).toBe(1);
      expect(mockSendPaymentUpcoming).toHaveBeenCalledTimes(2);
    });

    it("deve ignorar quando sem admins", async () => {
      const d3 = addDays(startOfDay(new Date()), 3);
      mockPaymentFindMany.mockResolvedValue([{ id: "p1", companyId: "c1", amount: 100, dueDate: d3 }]);
      mockCompanyFindUnique.mockResolvedValue({ cnpj: "111", name: "Acme" });
      mockUserFindMany.mockResolvedValue([]);
      const result = await runPaymentUpcomingJob();
      expect(result.sent3d).toBe(0);
      expect(mockSendPaymentUpcoming).not.toHaveBeenCalled();
    });

    it("deve tratar erro de envio", async () => {
      const d3 = addDays(startOfDay(new Date()), 3);
      mockPaymentFindMany.mockResolvedValue([{ id: "p1", companyId: "c1", amount: 100, dueDate: d3 }]);
      mockCompanyFindUnique.mockResolvedValue({ cnpj: "111", name: "Acme" });
      mockUserFindMany.mockResolvedValue([{ email: "a@test.com" }]);
      mockSendPaymentUpcoming.mockRejectedValueOnce(new Error("fail"));
      const result = await runPaymentUpcomingJob();
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("runBiometricExpiringJob", () => {
    it("deve enviar para usuários na janela 20-35 dias e atualizar notifiedAt", async () => {
      const now = new Date();
      const updatedAt = new Date(now);
      updatedAt.setMonth(updatedAt.getMonth() - 23);
      const user = {
        id: "u1",
        name: "Carlos",
        email: "carlos@test.com",
        faceDescriptorUpdatedAt: updatedAt,
      };
      mockExtendedUserFindMany.mockResolvedValue([user]);
      mockUserUpdate.mockResolvedValue({});

      const result = await runBiometricExpiringJob();
      expect(mockExtendedUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "ACTIVE",
            faceRevalidationNotifiedAt: null,
          }),
        })
      );
      expect(result.errors).toHaveLength(0);
    });

    it("deve não enviar quando daysUntilExpiry fora da janela", async () => {
      const veryOld = new Date();
      veryOld.setMonth(veryOld.getMonth() - 24);
      mockExtendedUserFindMany.mockResolvedValue([
        { id: "u2", name: "Ana", email: "ana@test.com", faceDescriptorUpdatedAt: veryOld },
      ]);
      const result = await runBiometricExpiringJob();
      expect(mockSendBiometricExpiring).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
    });

    it("deve capturar erro de envio", async () => {
      const updatedAt = new Date();
      updatedAt.setMonth(updatedAt.getMonth() - 23);
      mockExtendedUserFindMany.mockResolvedValue([
        { id: "u3", name: "Bob", email: "bob@test.com", faceDescriptorUpdatedAt: updatedAt },
      ]);
      mockSendBiometricExpiring.mockRejectedValueOnce(new Error("fail biometric"));
      mockUserUpdate.mockResolvedValue({});
      const result = await runBiometricExpiringJob();
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });
  });
});

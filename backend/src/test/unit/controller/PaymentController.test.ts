import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  company: { findUnique: vi.fn(), update: vi.fn() },
  user: { findFirst: vi.fn() },
  subscription: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  payment: { findMany: vi.fn(), create: vi.fn() },
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../services/asaasService.js", () => ({
  createCustomer: vi.fn().mockResolvedValue({ id: "asaas-cust-1" }),
  createSubscription: vi.fn().mockResolvedValue({ id: "asaas-sub-1", invoiceUrl: "https://asaas.com/pay/1" }),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  validateWebhookToken: vi.fn().mockReturnValue(true),
}));

import { PaymentController } from "../../../controller/payment/PaymentController.js";
import * as asaasService from "../../../services/asaasService.js";

describe("PaymentController", () => {
  let controller: PaymentController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    controller = new PaymentController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createCheckout", () => {
    it("deve criar checkout com PIX", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "c1", name: "Empresa", cnpj: "11222333000181", asaasCustomerId: "asaas-cust-1",
        _count: { users: 5 },
      });
      mockPrisma.subscription.create.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});

      req = {
        user: { companyId: "c1" },
        body: { billingType: "PIX" },
      };

      await controller.createCheckout(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: "asaas-sub-1",
          billingType: "PIX",
        })
      );
    });

    it("deve criar customer quando não existe asaasCustomerId", async () => {
      mockPrisma.company.findUnique
        .mockResolvedValueOnce({
          id: "c1", name: "Empresa", cnpj: "11222333000181", asaasCustomerId: null,
          _count: { users: 3 },
        });
      mockPrisma.user.findFirst.mockResolvedValue({ email: "admin@test.com" });
      mockPrisma.company.update.mockResolvedValue({});
      mockPrisma.subscription.create.mockResolvedValue({});

      req = {
        user: { companyId: "c1" },
        body: { billingType: "CREDIT_CARD" },
      };

      await controller.createCheckout(req, res);

      expect(asaasService.createCustomer).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("deve retornar 401 quando não há companyId", async () => {
      req = { user: {}, body: { billingType: "PIX" } };

      await controller.createCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("deve retornar 404 quando empresa não existe", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      req = { user: { companyId: "c1" }, body: { billingType: "PIX" } };

      await controller.createCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getPaymentHistory", () => {
    it("deve retornar histórico de pagamentos", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: "p1", amount: 54.90, billingType: "PIX", status: "CONFIRMED",
          dueDate: new Date(), paidAt: new Date(), paymentUrl: null,
          nfseStatus: "PENDING", nfseNumber: null, nfseUrl: null },
      ]);

      req = { user: { companyId: "c1" } };

      await controller.getPaymentHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ amount: 54.90 }),
        ])
      );
    });

    it("deve retornar 401 quando não há companyId", async () => {
      req = { user: {} };

      await controller.getPaymentHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("cancelSubscription", () => {
    it("deve cancelar assinatura ativa", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1", companyId: "c1", status: "ACTIVE", asaasSubscriptionId: "asaas-sub-1",
      });
      mockPrisma.subscription.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});

      req = { user: { companyId: "c1" } };

      await controller.cancelSubscription(req, res);

      expect(asaasService.cancelSubscription).toHaveBeenCalledWith("asaas-sub-1");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("cancelada") })
      );
    });

    it("deve retornar 404 quando não há assinatura ativa", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      req = { user: { companyId: "c1" } };

      await controller.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve cancelar sem chamar Asaas quando não tem asaasSubscriptionId", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1", companyId: "c1", status: "ACTIVE", asaasSubscriptionId: null,
      });
      mockPrisma.subscription.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});

      req = { user: { companyId: "c1" } };

      await controller.cancelSubscription(req, res);

      expect(asaasService.cancelSubscription).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("handleWebhook", () => {
    it("deve processar PAYMENT_CONFIRMED", async () => {
      mockPrisma.company.update.mockResolvedValue({});
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1", companyId: "c1", asaasSubscriptionId: "asaas-sub-1",
      });
      mockPrisma.payment.create.mockResolvedValue({});

      req = {
        headers: { "asaas-access-token": "test-webhook-token" },
        body: {
          event: "PAYMENT_CONFIRMED",
          payment: {
            id: "pay-1", value: 54.90, billingType: "PIX",
            externalReference: "c1", subscription: "asaas-sub-1",
            dueDate: "2026-08-10", paymentDate: "2026-08-10",
          },
        },
      };

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("deve processar PAYMENT_OVERDUE e suspender empresa", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ status: "ACTIVE" });
      mockPrisma.company.update.mockResolvedValue({});

      req = {
        headers: { "asaas-access-token": "test-webhook-token" },
        body: {
          event: "PAYMENT_OVERDUE",
          payment: { id: "pay-1", externalReference: "c1" },
        },
      };

      await controller.handleWebhook(req, res);

      expect(mockPrisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1" },
          data: { status: "SUSPENDED" },
        })
      );
    });

    it("deve processar SUBSCRIPTION_DELETED", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1", companyId: "c1", asaasSubscriptionId: "asaas-sub-1",
      });
      mockPrisma.subscription.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});

      req = {
        headers: { "asaas-access-token": "test-webhook-token" },
        body: {
          event: "SUBSCRIPTION_DELETED",
          payment: { subscription: "asaas-sub-1" },
        },
      };

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CANCELLED" }),
        })
      );
    });

    it("deve retornar 401 com token inválido", async () => {
      (asaasService.validateWebhookToken as any).mockReturnValue(false);

      req = {
        headers: { "asaas-access-token": "wrong-token" },
        body: { event: "PAYMENT_CONFIRMED", payment: {} },
      };

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("deve retornar 200 mesmo com erro interno (webhook idempotente)", async () => {
      (asaasService.validateWebhookToken as any).mockReturnValue(true);
      mockPrisma.company.update.mockRejectedValue(new Error("DB error"));

      req = {
        headers: { "asaas-access-token": "test-webhook-token" },
        body: {
          event: "PAYMENT_CONFIRMED",
          payment: { id: "pay-1", value: 54.90, billingType: "PIX", externalReference: "c1" },
        },
      };

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true, error: true });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao processar webhook"),
        expect.anything()
      );
    });
  });
});

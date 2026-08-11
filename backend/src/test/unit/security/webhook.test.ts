import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    company: { update: vi.fn(), findUnique: vi.fn() },
    subscription: { findFirst: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn() },
  },
}));

vi.mock("../../../services/asaasService.js", () => ({
  asaasService: { handlePaymentStatus: vi.fn() },
  validateWebhookToken: vi.fn(),
}));

import { PaymentController } from "../../../controller/payment/PaymentController.js";
import { validateWebhookToken } from "../../../services/asaasService.js";
import { prisma } from "../../../database/prisma.js";

const mockPrisma = prisma as any;
const mockValidate = validateWebhookToken as any;

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const VALID_TOKEN = "valid-webhook-token";
const VALID_WEBHOOK_BODY = {
  event: "PAYMENT_CONFIRMED",
  payment: {
    id: "pay_test_001",
    customer: "cus_001",
    subscription: "sub_001",
    status: "CONFIRMED",
    value: 99.90,
    billingType: "PIX",
    dueDate: "2026-08-10",
    paymentDate: "2026-08-10",
    externalReference: "comp-uuid-001",
  },
};

describe("Security: Webhook — Autenticação e Integridade", () => {
  let controller: PaymentController;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    controller = new PaymentController();
    res = makeRes();
    mockValidate.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Autenticação do Token", () => {
    it("deve rejeitar webhook com token ausente", async () => {
      mockValidate.mockReturnValue(false);

      const req = { headers: {}, body: VALID_WEBHOOK_BODY } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Token inválido" });
    });

    it("deve rejeitar webhook com token inválido", async () => {
      mockValidate.mockReturnValue(false);

      const req = { headers: { "asaas-access-token": "wrong-token" }, body: VALID_WEBHOOK_BODY } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Token inválido" });
    });

    it("deve aceitar webhook com token válido", async () => {
      mockPrisma.company.update.mockResolvedValue({});
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const req = { headers: { "asaas-access-token": VALID_TOKEN }, body: VALID_WEBHOOK_BODY } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("Payloads Malformados", () => {
    it("deve retornar 200 com payload vazio (fail-open)", async () => {
      const req = { headers: { "asaas-access-token": VALID_TOKEN }, body: {} } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve retornar 200 com evento desconhecido (ignorado)", async () => {
      const req = {
        headers: { "asaas-access-token": VALID_TOKEN },
        body: { event: "UNKNOWN_EVENT", payment: {} },
      } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("deve retornar 200 mesmo com body null (fail-open)", async () => {
      const req = { headers: { "asaas-access-token": VALID_TOKEN }, body: null } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao processar webhook"),
        expect.anything()
      );
    });
  });

  describe("Idempotência — Pagamentos Duplicados", () => {
    it("deve retornar 200 quando pagamento duplicado viola unique constraint", async () => {
      mockPrisma.company.update.mockResolvedValue({});
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1",
        companyId: "comp-uuid-001",
        asaasSubscriptionId: "sub_001",
      });
      mockPrisma.payment.create.mockRejectedValue(
        new Error("Unique constraint failed on the fields: (`asaasPaymentId`)")
      );

      const req = { headers: { "asaas-access-token": VALID_TOKEN }, body: VALID_WEBHOOK_BODY } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true, error: true });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao processar webhook"),
        expect.anything()
      );
    });
  });

  describe("Eventos de Pagamento", () => {
    it("deve processar PAYMENT_RECEIVED e criar pagamento", async () => {
      mockPrisma.company.update.mockResolvedValue({});
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1",
        companyId: "comp-uuid-001",
        asaasSubscriptionId: "sub_001",
      });
      mockPrisma.payment.create.mockResolvedValue({});

      const req = {
        headers: { "asaas-access-token": VALID_TOKEN },
        body: { ...VALID_WEBHOOK_BODY, event: "PAYMENT_RECEIVED" },
      } as any;
      await controller.handleWebhook(req, res);

      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve processar PAYMENT_OVERDUE e suspender empresa", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ status: "ACTIVE" });
      mockPrisma.company.update.mockResolvedValue({});

      const req = {
        headers: { "asaas-access-token": VALID_TOKEN },
        body: {
          event: "PAYMENT_OVERDUE",
          payment: { id: "pay-1", externalReference: "comp-uuid-001" },
        },
      } as any;
      await controller.handleWebhook(req, res);

      expect(mockPrisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comp-uuid-001" },
          data: { status: "SUSPENDED" },
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve processar SUBSCRIPTION_DELETED e cancelar assinatura", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1",
        companyId: "comp-uuid-001",
        asaasSubscriptionId: "sub_001",
      });
      mockPrisma.subscription.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});

      const req = {
        headers: { "asaas-access-token": VALID_TOKEN },
        body: {
          event: "SUBSCRIPTION_DELETED",
          payment: { subscription: "sub_001" },
        },
      } as any;
      await controller.handleWebhook(req, res);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CANCELLED" }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("Fail-Open — Erros Internos", () => {
    it("deve retornar 200 quando DB falha durante PAYMENT_CONFIRMED", async () => {
      mockPrisma.company.update.mockRejectedValue(new Error("Connection lost"));

      const req = { headers: { "asaas-access-token": VALID_TOKEN }, body: VALID_WEBHOOK_BODY } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true, error: true });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao processar webhook"),
        expect.anything()
      );
    });

    it("deve retornar 200 quando subscription não encontrada", async () => {
      mockPrisma.company.update.mockResolvedValue({});
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const req = { headers: { "asaas-access-token": VALID_TOKEN }, body: VALID_WEBHOOK_BODY } as any;
      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });
});

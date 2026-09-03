import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../../../utils/environment.js", () => ({
  Env: {
    ASAAS_API_KEY: "test-asaas-api-key",
    ASAAS_WEBHOOK_TOKEN: "test-webhook-token",
    ASAAS_ENVIRONMENT: "sandbox",
  },
}));

import {
  createCustomer,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  createPayment,
  getPayment,
  getPaymentsByCustomer,
  validateWebhookToken,
} from "../../../services/asaasService.js";

describe("asaasService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const successResponse = (data: any) => ({
    ok: true,
    json: () => Promise.resolve(data),
  });

  const errorResponse = (error: any) => ({
    ok: false,
    json: () => Promise.resolve(error),
  });

  describe("createCustomer", () => {
    it("deve criar cliente com dados corretos", async () => {
      const customerData = { id: "cust_123", name: "Empresa Teste" };
      mockFetch.mockResolvedValue(successResponse(customerData));

      const result = await createCustomer({
        name: "Empresa Teste",
        cpfCnpj: "11222333000181",
        email: "teste@empresa.com",
      });

      expect(result).toEqual(customerData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/customers"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            access_token: "test-asaas-api-key",
          }),
        })
      );
    });

    it("deve lançar erro quando API retorna erro", async () => {
      mockFetch.mockResolvedValue(
        errorResponse({ errors: [{ description: "Invalid data" }] })
      );

      await expect(
        createCustomer({ name: "Empresa", cpfCnpj: "000", email: "invalid" })
      ).rejects.toThrow("Asaas createCustomer failed");
    });
  });

  describe("createSubscription", () => {
    it("deve criar assinatura com ciclo mensal", async () => {
      const subData = { id: "sub_123", invoiceUrl: "https://asaas.com/inv" };
      mockFetch.mockResolvedValue(successResponse(subData));

      const result = await createSubscription({
        customerId: "cust_123",
        billingType: "PIX",
        value: 54.9,
        description: "Plano Ponto Fragata",
      });

      expect(result).toEqual(subData);

      const callArgs = mockFetch.mock.calls[0] as any[];
      const callBody = JSON.parse(callArgs[1]?.body as string);
      expect(callBody.cycle).toBe("MONTHLY");
      expect(callBody.billingType).toBe("PIX");
      expect(callBody.value).toBe(54.9);
    });

    it("deve lançar erro quando API retorna erro", async () => {
      mockFetch.mockResolvedValue(
        errorResponse({ errors: [{ description: "Invalid customer" }] })
      );

      await expect(
        createSubscription({
          customerId: "invalid",
          billingType: "PIX",
          value: 54.9,
          description: "Test",
        })
      ).rejects.toThrow("Asaas createSubscription failed");
    });
  });

  describe("updateSubscription", () => {
    it("deve atualizar assinatura", async () => {
      const updated = { id: "sub_123", value: 79.9 };
      mockFetch.mockResolvedValue(successResponse(updated));

      const result = await updateSubscription("sub_123", { value: 79.9 });

      expect(result).toEqual(updated);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions/sub_123"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("deve lançar erro quando API retorna erro", async () => {
      mockFetch.mockResolvedValue(
        errorResponse({ errors: [{ description: "Not found" }] })
      );

      await expect(
        updateSubscription("invalid", { value: 50 })
      ).rejects.toThrow("Asaas updateSubscription failed");
    });
  });

  describe("cancelSubscription", () => {
    it("deve cancelar assinatura", async () => {
      mockFetch.mockResolvedValue(successResponse({}));

      await cancelSubscription("sub_123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions/sub_123"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("deve lançar erro quando API retorna erro", async () => {
      mockFetch.mockResolvedValue(
        errorResponse({ errors: [{ description: "Not found" }] })
      );

      await expect(cancelSubscription("invalid")).rejects.toThrow(
        "Asaas cancelSubscription failed"
      );
    });
  });

  describe("createPayment", () => {
    it("deve criar pagamento avulso", async () => {
      const paymentData = { id: "pay_123", status: "PENDING" };
      mockFetch.mockResolvedValue(successResponse(paymentData));

      const result = await createPayment({
        customerId: "cust_123",
        billingType: "BOLETO",
        value: 100,
        dueDate: "2026-09-10",
        description: "Pagamento avulso",
      });

      expect(result).toEqual(paymentData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/payments"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("deve lançar erro quando API retorna erro", async () => {
      mockFetch.mockResolvedValue(
        errorResponse({ errors: [{ description: "Invalid value" }] })
      );

      await expect(
        createPayment({
          customerId: "cust_123",
          billingType: "PIX",
          value: -1,
          dueDate: "2026-09-10",
          description: "Test",
        })
      ).rejects.toThrow("Asaas createPayment failed");
    });
  });

  describe("getPayment", () => {
    it("deve retornar pagamento por ID", async () => {
      const payment = { id: "pay_123", value: 100 };
      mockFetch.mockResolvedValue(successResponse(payment));

      const result = await getPayment("pay_123");

      expect(result).toEqual(payment);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/payments/pay_123"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("deve lançar erro quando pagamento não encontrado", async () => {
      mockFetch.mockResolvedValue(
        errorResponse({ errors: [{ description: "Not found" }] })
      );

      await expect(getPayment("nonexistent")).rejects.toThrow(
        "Asaas getPayment failed"
      );
    });
  });

  describe("getPaymentsByCustomer", () => {
    it("deve listar pagamentos de um cliente", async () => {
      const payments = { data: [{ id: "pay_1" }, { id: "pay_2" }] };
      mockFetch.mockResolvedValue(successResponse(payments));

      const result = await getPaymentsByCustomer("cust_123");

      expect(result).toEqual(payments);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("customer=cust_123"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("deve suportar limite customizado", async () => {
      mockFetch.mockResolvedValue(successResponse({ data: [] }));

      await getPaymentsByCustomer("cust_123", 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
        expect.any(Object)
      );
    });

    it("deve lançar erro quando API retorna erro", async () => {
      mockFetch.mockResolvedValue(
        errorResponse({ errors: [{ description: "Forbidden" }] })
      );

      await expect(getPaymentsByCustomer("cust_123")).rejects.toThrow(
        "Asaas getPayments failed"
      );
    });
  });

  describe("validateWebhookToken", () => {
    it("deve retornar true para token válido", () => {
      expect(validateWebhookToken("test-webhook-token")).toBe(true);
    });

    it("deve retornar false para token inválido", () => {
      expect(validateWebhookToken("wrong-token")).toBe(false);
    });

    it("deve retornar false para string vazia", () => {
      expect(validateWebhookToken("")).toBe(false);
    });
  });

  describe("URL base", () => {
    it("deve usar sandbox quando ASAAS_ENVIRONMENT não é production", async () => {
      mockFetch.mockResolvedValue(successResponse({ id: "test" }));

      await createCustomer({
        name: "Test",
        cpfCnpj: "000",
        email: "test@test.com",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api-sandbox.asaas.com"),
        expect.any(Object)
      );
    });
  });
});

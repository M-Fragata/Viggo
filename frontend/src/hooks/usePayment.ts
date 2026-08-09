import { useState, useCallback } from "react";
import { api, type PaymentHistoryItem, type CheckoutResponse } from "../services/api";
import { useToast } from "./useToast";

export function usePayment() {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createCheckout = useCallback(
    async (billingType: "PIX" | "CREDIT_CARD"): Promise<CheckoutResponse | null> => {
      setIsLoading(true);
      try {
        const result = await api.payments.createCheckout({ billingType });
        toast.success("Checkout criado", { description: "Redirecionando para pagamento..." });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao criar checkout";
        toast.error("Erro no checkout", { description: message });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      await api.payments.cancel();
      toast.success("Assinatura cancelada");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao cancelar";
      toast.error("Erro ao cancelar", { description: message });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const history = await api.payments.getHistory();
      setPaymentHistory(history);
    } catch {
      setPaymentHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    paymentHistory,
    isLoading,
    createCheckout,
    cancelSubscription,
    fetchHistory,
  };
}

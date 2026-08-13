import { useState } from "react";
import { usePayment } from "../../hooks/usePayment";
import { X, CreditCard, Loader2 } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const { createCheckout, isLoading } = usePayment();

  if (!isOpen) return null;

  const handleCheckout = async () => {
    const result = await createCheckout(selectedMethod);
    if (result) {
      if (result.paymentUrl) {
        window.open(result.paymentUrl, "_blank");
      }
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <dialog
        className="absolute z-10 w-full p-6 mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl animate-in zoom-in-95"
        open
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Ativar plano</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Escolha o método de pagamento para ativar seu plano:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedMethod("PIX")}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-bold text-sm transition-all ${
                selectedMethod === "PIX"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              Pix
            </button>
            <button
              onClick={() => setSelectedMethod("CREDIT_CARD")}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-bold text-sm transition-all ${
                selectedMethod === "CREDIT_CARD"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              <CreditCard size={20} />
              Cartão
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
            {selectedMethod === "PIX" ? (
              <p>Após confirmar, você receberá um QR Code e código copia-e-cola para pagamento via Pix.</p>
            ) : (
              <p>Será redirecionado para o checkout seguro do Asaas para inserir os dados do cartão.</p>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar pagamento"
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </dialog>
      <div className="fixed inset-0" onClick={onClose} />
    </div>
  );
}

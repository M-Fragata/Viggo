import { useState } from "react";
import { X, MonitorSmartphone, Loader2 } from "lucide-react";
import { api } from "../../services/api";

interface TotemActivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: (token: string, expiresIn: number) => void;
}

export function TotemActivateModal({ isOpen, onClose, onActivated }: TotemActivateModalProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async () => {
    setError(null);

    if (!/^\d{4,6}$/.test(pin)) {
      setError("O PIN deve conter apenas números (4 a 6 dígitos).");
      return;
    }

    if (pin !== confirmPin) {
      setError("Os PINs não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.totem.activate(pin);
      localStorage.setItem("@viggo:totem", result.totemToken);
      localStorage.setItem("@viggo:totem:expiresAt", String(Date.now() + result.expiresIn * 1000));
      onActivated?.(result.totemToken, result.expiresIn);
      setPin("");
      setConfirmPin("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar o modo totem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <dialog
        className="w-full max-w-2xl m-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95"
        open
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MonitorSmartphone className="text-emerald-600" size={22} />
            Ativar Modo Totem
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Defina um PIN de segurança para proteger a saída do modo totem. O modo permite que
            funcionários registrem ponto com email, senha e reconhecimento facial neste dispositivo.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PIN (4 a 6 dígitos)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={isLoading}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Ativando...
              </>
            ) : (
              "Ativar modo totem"
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

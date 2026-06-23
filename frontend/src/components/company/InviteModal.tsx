import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Copy, Check } from "lucide-react";
import { useInvites } from "../../hooks/useInvites";
import { useToast } from "../../hooks/useToast";

const inviteSchema = z.object({
  email: z.email("Email inválido"),
  role: z.enum(["ENTERPRISE_ADMIN", "EMPLOYEE"], { message: "Selecione um cargo" }),
})

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  canCreateEmployee: boolean;
  employeeLimitReached: boolean;
}

export function InviteModal({ isOpen, onClose, canCreateEmployee, employeeLimitReached }: InviteModalProps) {
  const { createInvite } = useInvites();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "EMPLOYEE" },
  });

  const onSubmit = async (data: InviteFormData) => {
    if (employeeLimitReached) {
      toast.error("Limite atingido", { description: "Não é possível convidar mais funcionários no plano atual" });
      return;
    }

    try {
      const invite = await createInvite(data);
      setLastInviteUrl(invite.inviteUrl);
      setCopied(false);
      reset();
      toast.success("Convite criado!", { description: `Link copiado para ${data.email}` });
    } catch (err) {
      toast.error("Erro ao criar convite", { description: err instanceof Error ? err.message : "Tente novamente" });
    }
  };

  const copyLink = () => {
    if (lastInviteUrl) {
      navigator.clipboard.writeText(lastInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <dialog
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95"
        open
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Convidar Funcionário</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {!canCreateEmployee && !employeeLimitReached && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            Seu plano não permite adicionar mais funcionários. Faça upgrade para convidar.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email do funcionário</label>
            <input
              {...register("email")}
              type="email"
              placeholder="joao@empresa.com"
              disabled={employeeLimitReached || !canCreateEmployee}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
            <select
              {...register("role")}
              disabled={employeeLimitReached || !canCreateEmployee}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
            >
              <option value="EMPLOYEE">Funcionário</option>
              <option value="ENTERPRISE_ADMIN">Administrador da Empresa</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || employeeLimitReached || !canCreateEmployee}
              className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Enviando..." : "Enviar Convite"}
            </button>
          </div>
        </form>

        {lastInviteUrl && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-bottom-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Link do convite (válido por 7 dias):</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={lastInviteUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-600"
              />
              <button
                type="button"
                onClick={copyLink}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className="text-sm">{copied ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>
          </div>
        )}
      </dialog>
      <div className="fixed inset-0" onClick={onClose} />
    </div>
  );
}
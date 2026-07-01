import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useInviteTokens } from "../../hooks/useInviteTokens";
import { useCompany, usePlanLimits } from "../../hooks/useCompany";
import { useToast } from "../../hooks/useToast";
import { InviteTokenTable } from "./InviteTokenTable";
import { InviteTokenTableSkeleton } from "../InviteTokenTableSkeleton";

export function InvitesTab() {
  const { company, isLoading: companyLoading } = useCompany();
  const { getPlanLimit } = usePlanLimits();
  const { toast } = useToast();
  const { tokens, isLoading: tokensLoading, fetchTokens, createToken, revokeToken } = useInviteTokens();

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const plan = company?.plan;
  const planLimit = plan ? getPlanLimit(plan) : null;
  const canCreateEmployee = company?.canCreateEmployee ?? false;
  const employeeLimitReached = !canCreateEmployee && (company?.currentEmployees ?? 0) >= (planLimit?.maxEmployees ?? 0);

  const handleGenerateToken = async () => {
    if (employeeLimitReached || !canCreateEmployee) return;
    setIsGenerating(true);
    try {
      await createToken({ expiresInDays: 7, maxUses: null });
      toast.success("Link de convite gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar link de convite");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeToken(id);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!", { description: "Pronto para compartilhar" });
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">Links de Convite</h2>
        <button
          onClick={handleGenerateToken}
          disabled={isGenerating || employeeLimitReached || !canCreateEmployee}
          className="cursor-pointer px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus size={18} />
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : (
            "Gerar Link de Convite"
          )}
        </button>
      </div>

      {!canCreateEmployee && !employeeLimitReached && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
          Seu plano não permite adicionar mais funcionários. Faça upgrade para gerar links de convite.
        </div>
      )}

      {tokensLoading ? (
        <InviteTokenTableSkeleton />
      ) : (
        <InviteTokenTable
          tokens={tokens}
          onRevoke={handleRevoke}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
}
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar link de convite");
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
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded shimmer" />
              <div className="h-4 w-72 bg-slate-200 dark:bg-white/10 rounded shimmer" />
            </div>
            <div className="h-10 w-36 bg-slate-200 dark:bg-white/10 rounded-xl shimmer" />
          </div>
          <InviteTokenTableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Links de Convite</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gere tokens e links de acesso para novos colaboradores</p>
          </div>
          <button
            onClick={handleGenerateToken}
            disabled={isGenerating || employeeLimitReached || !canCreateEmployee}
            className="cursor-pointer px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-sm"
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
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-700 dark:text-amber-300 text-sm">
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
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { api, type CompanyResponse, type UsageResponse, type UpdateCompanyDto } from "../services/api";
import { useToast } from "./useToast";

export function useCompany() {
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCompany = useCallback(async () => {
    try {
      setIsLoading(true);
      const [companyData, usageData] = await Promise.all([
        api.company.getMe(),
        api.company.getUsage(),
      ]);
      setCompany(companyData);
      setUsage(usageData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar empresa");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const updateCompany = useCallback(
    async (data: UpdateCompanyDto) => {
      const updated = await api.company.updateMe(data);
      setCompany(updated);
      toast.success("Empresa atualizada", { description: "Configurações salvas com sucesso" });
      return updated;
    },
    [toast]
  );

  const refresh = useCallback(() => {
    fetchCompany();
  }, [fetchCompany]);

  return {
    company,
    usage,
    isLoading,
    error,
    updateCompany,
    refresh,
  };
}

export function usePlanLimits() {
  const limits = {
    TIER_I: { maxEmployees: 10, price: 49.9, api: { general: 100, checkin: 10, faceValidation: 30 } },
    TIER_II: { maxEmployees: 50, price: 149.9, api: { general: 300, checkin: 20, faceValidation: 60 } },
    TIER_III: { maxEmployees: 150, price: 349.9, api: { general: 600, checkin: 50, faceValidation: 100 } },
    ENTERPRISE_CUSTOM: { maxEmployees: null, price: null, api: { general: 1000, checkin: 100, faceValidation: 200 } },
  } as const;

  const getPlanLimit = (plan: keyof typeof limits) => limits[plan];

  const getPlanColor = (plan: keyof typeof limits) => {
    switch (plan) {
      case "TIER_I":
        return "emerald";
      case "TIER_II":
        return "blue";
      case "TIER_III":
        return "purple";
      case "ENTERPRISE_CUSTOM":
        return "amber";
      default:
        return "gray";
    }
  };

  const getPlanLabel = (plan: keyof typeof limits) => {
    switch (plan) {
      case "TIER_I":
        return "Tier I";
      case "TIER_II":
        return "Tier II";
      case "TIER_III":
        return "Tier III";
      case "ENTERPRISE_CUSTOM":
        return "Enterprise";
      default:
        return plan;
    }
  };

  return { limits, getPlanLimit, getPlanColor, getPlanLabel };
}
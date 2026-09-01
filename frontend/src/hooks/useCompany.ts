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
    let isMounted = true;
    Promise.all([
      api.company.getMe(),
      api.company.getUsage(),
    ]).then(([companyData, usageData]) => {
      if (isMounted) {
        setCompany(companyData);
        setUsage(usageData);
        setError(null);
        setIsLoading(false);
      }
    }).catch((err) => {
      if (isMounted) {
        setError(err instanceof Error ? err.message : "Erro ao carregar empresa");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
    DYNAMIC: {
      maxEmployees: null,
      price: 54.90,
      basePrice: 54.90,
      baseMaxEmployees: 10,
      extraPricePerEmployee: 5.00,
      api: { general: 100, checkin: 10, faceValidation: 30 },
    },
    ENTERPRISE_CUSTOM: {
      maxEmployees: null,
      price: null,
      api: { general: 1000, checkin: 100, faceValidation: 200 },
    },
  } as const;

  const getPlanLimit = (plan: keyof typeof limits) => limits[plan];

  const getPlanColor = (plan: keyof typeof limits) => {
    switch (plan) {
      case "DYNAMIC":
        return "emerald";
      case "ENTERPRISE_CUSTOM":
        return "amber";
      default:
        return "gray";
    }
  };

  const getPlanLabel = (plan: keyof typeof limits) => {
    switch (plan) {
      case "DYNAMIC":
        return "Viggo";
      case "ENTERPRISE_CUSTOM":
        return "Enterprise";
      default:
        return plan;
    }
  };

  const calculatePrice = (totalUsers: number) => {
    const paidEmployees = Math.max(0, totalUsers - 1);
    const extras = Math.max(0, paidEmployees - limits.DYNAMIC.baseMaxEmployees);
    return Math.round((limits.DYNAMIC.basePrice + extras * limits.DYNAMIC.extraPricePerEmployee) * 100) / 100;
  };

  return { limits, getPlanLimit, getPlanColor, getPlanLabel, calculatePrice };
}

import { useState, useCallback } from "react";
import { api, type MasterListParams, type MasterCompaniesResponse, type MasterCompanyDetail, type MasterMetricsResponse, type PlanTier, type CompanyStatus } from "../services/api";
import { useToast } from "./useToast";

export function useMasterCompanies() {
  const [data, setData] = useState<MasterCompaniesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(
    async (params?: MasterListParams) => {
      try {
        setIsLoading(true);
        const result = await api.master.listCompanies(params);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar empresas");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    companies: data?.data || [],
    pagination: data?.meta,
    isLoading,
    error,
    fetchCompanies,
  };
}

export function useMasterCompany(id: string) {
  const [company, setCompany] = useState<MasterCompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.master.getCompany(id);
      setCompany(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar empresa");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  return { company, isLoading, error, fetchCompany };
}

export function useMasterMetrics() {
  const [metrics, setMetrics] = useState<MasterMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.master.getMetrics();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar métricas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { metrics, isLoading, error, fetchMetrics };
}

export function useMasterActions() {
  const { toast } = useToast();

  const updatePlan = useCallback(
    async (companyId: string, planTier: PlanTier) => {
      const result = await api.master.updatePlan(companyId, planTier);
      toast.success("Plano alterado", { description: `Plano atualizado para ${planTier}` });
      return result;
    },
    [toast]
  );

  const updateStatus = useCallback(
    async (companyId: string, status: CompanyStatus) => {
      const result = await api.master.updateStatus(companyId, status);
      toast.success("Status alterado", { description: `Empresa ${status.toLowerCase()}` });
      return result;
    },
    [toast]
  );

  const extendTrial = useCallback(
    async (companyId: string, days: number) => {
      const result = await api.master.extendTrial(companyId, days);
      toast.success("Trial estendido", { description: `${days} dias adicionados` });
      return result;
    },
    [toast]
  );

  const impersonate = useCallback(
    async (companyId: string, companyName: string) => {
      const result = await api.master.impersonate(companyId);
      return { ...result, companyName };
    },
    []
  );

  return { updatePlan, updateStatus, extendTrial, impersonate };
}
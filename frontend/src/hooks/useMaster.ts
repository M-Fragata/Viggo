import { useState, useCallback } from "react";
import {
  api,
  type MasterListParams,
  type MasterCompaniesResponse,
  type MasterCompanyDetail,
  type MasterMetricsResponse,
  type MasterAuditLogsResponse,
  type MasterAuditLogParams,
  type PlanTier,
  type CompanyStatus,
} from "../services/api";
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
    pagination: data?.pagination,
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

  const fetchMetrics = useCallback(async (params?: { from?: string; to?: string }) => {
    try {
      setIsLoading(true);
      const data = await api.master.getMetrics(params);
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

export function useMasterAuditLogs() {
  const [data, setData] = useState<MasterAuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async (params?: MasterAuditLogParams) => {
    try {
      setIsLoading(true);
      const result = await api.master.listAuditLogs(params);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar logs de auditoria");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    logs: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    fetchAuditLogs,
  };
}

export function useMasterActions() {
  const { toast } = useToast();

  const updatePlan = useCallback(
    async (
      companyId: string,
      data:
        | PlanTier
        | {
            plan: PlanTier;
            pricingModel?: "FIXED" | "TIERED_EXTRA";
            maxEmployees?: number;
            price?: number;
            basePrice?: number;
            extraPricePerUnit?: number;
            planExpiresAt?: string | null;
          }
    ) => {
      const result = await api.master.updatePlan(companyId, data);
      const planName = typeof data === "string" ? data : data.plan;
      const label = planName === "DYNAMIC" ? "Ponto Fragata" : "Enterprise Personalizado";
      toast.success("Plano alterado", { description: `Plano atualizado para ${label}` });
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

  const exportCompanies = useCallback(
    async (params?: { status?: CompanyStatus; plan?: PlanTier; search?: string }) => {
      try {
        toast.info("Gerando exportação...", { description: "Preparando arquivo CSV com filtros ativos" });
        const blob = await api.master.exportCompanies(params);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `empresas_pontofragata_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Download concluído!", { description: "Arquivo CSV baixado com sucesso" });
      } catch (err) {
        toast.error("Erro ao exportar", { description: err instanceof Error ? err.message : "Falha na exportação" });
      }
    },
    [toast]
  );

  return { updatePlan, updateStatus, extendTrial, impersonate, exportCompanies };
}
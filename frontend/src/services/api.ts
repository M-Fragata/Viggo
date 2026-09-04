import { API_URL } from "../utils/api";

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  totemToken?: boolean;
  responseType?: "json" | "blob";
  /** Quando true, um 401 lança ApiError em vez de deslogar o usuário.
   * Use para endpoints que retornam 401 com significado próprio (ex: token facial inválido). */
  skipAuthRedirect?: boolean;
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  data?: Record<string, unknown>;

  constructor(message: string, code?: string, status?: number, data?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(err: unknown): err is ApiError {
  return (
    err instanceof ApiError ||
    (typeof err === "object" &&
      err !== null &&
      ((err as any).name === "ApiError" || typeof (err as any).status === "number"))
  );
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requiresAuth = true, totemToken = false, responseType = "json", skipAuthRedirect = false, headers = {}, ...restOptions } = options;

  const token = totemToken
    ? localStorage.getItem("@fragata:totem")
    : requiresAuth
      ? localStorage.getItem("@fragata:token")
      : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  });

  if (response.status === 401) {
    if (skipAuthRedirect) {
      const error = await response.json().catch(() => ({ message: "Token inválido ou expirado" }));
      throw new ApiError(error.message || "Token inválido ou expirado", error.code, 401, error);
    }
    if (totemToken) {
      localStorage.removeItem("@fragata:totem");
      window.location.href = "/";
      return new Promise<T>(() => { }) as Promise<T>;
    }
    localStorage.removeItem("@fragata:token");
    window.location.href = "/";
    return new Promise<T>(() => { }) as Promise<T>;
  }

  if (response.status === 403) {
    const error = await response.json().catch(() => ({}));
    if (!totemToken && error.code === "FACE_NOT_REGISTERED") {
      window.location.href = "/register";
      return new Promise<T>(() => { }) as Promise<T>;
    }
    throw new ApiError(error.message || `Erro ${response.status}`, error.code, response.status, error);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro na requisição" }));
    throw new ApiError(error.message || `Erro ${response.status}`, error.code, response.status, error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (responseType === "blob") {
    return response.blob() as Promise<T>;
  }

  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi<{ user: User; token: string; company: string; mustChangePassword?: boolean }>("/sessions/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      }),

    me: () => fetchApi<{ user: User }>("/auth/me"),

    changePassword: (newPassword: string) =>
      fetchApi<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }),

    signup: (data: SignupCompanyDto) =>
      fetchApi<SignupCompanyResponse>("/companies/signup", {
        method: "POST",
        body: JSON.stringify(data),
        requiresAuth: false,
      }),

    forgotPassword: (email: string) =>
      fetchApi<{ message: string; email?: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        requiresAuth: false,
      }),

    verifyResetCode: (email: string, code: string) =>
      fetchApi<{ token: string }>("/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email, code }),
        requiresAuth: false,
      }),

    resetPassword: (token: string, password: string) =>
      fetchApi<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        requiresAuth: false,
      }),
  },

  company: {
    getMe: () => fetchApi<CompanyResponse>("/companies/me"),
    updateMe: (data: UpdateCompanyDto) =>
      fetchApi<CompanyResponse>("/companies/me", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    getUsage: () => fetchApi<UsageResponse>("/companies/me/usage"),

    inviteTokens: {
      list: () => fetchApi<InviteTokenResponse[]>("/companies/me/invite-tokens"),
      create: (data: CreateInviteTokenDto) =>
        fetchApi<InviteTokenResponse>("/companies/me/invite-token", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      revoke: (id: string) =>
        fetchApi<{ message: string }>(`/companies/me/invite-tokens/${id}`, {
          method: "DELETE",
        }),
    },

    public: {
      getInviteByToken: (token: string) =>
        fetchApi<PublicInviteResponse>(`/companies/invites/${token}`, {
          requiresAuth: false,
        }),
      acceptInvite: (data: AcceptInviteDto) =>
        fetchApi<{ user: User; company: Company; token: string }>(
          "/companies/invites/accept",
          {
            method: "POST",
            body: JSON.stringify(data),
            requiresAuth: false,
          }
        ),
    },
  },

  employees: {
    list: (date?: string) =>
      fetchApi<EmployeeListItem[]>(`/employees${date ? `?date=${date}` : ""}`),
    create: (data: {
      name: string;
      email: string;
      role?: "EMPLOYEE" | "ENTERPRISE_ADMIN";
      workScheduleId?: string | null;
      customPassword?: string;
    }) =>
      fetchApi<{ user: EmployeeListItem; temporaryPassword: string; message: string }>("/employees", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    bulkImport: (employees: {
      name: string;
      email: string;
      role?: "EMPLOYEE" | "ENTERPRISE_ADMIN";
      workScheduleId?: string | null;
    }[]) =>
      fetchApi<{
        totalProcessed: number;
        createdCount: number;
        errorCount: number;
        createdEmployees: { id: string; name: string; email: string; role: string; temporaryPassword: string }[];
        errors: { name: string; email: string; reason: string }[];
        message: string;
      }>("/employees/bulk-import", {
        method: "POST",
        body: JSON.stringify({ employees }),
      }),
    issueFaceToken: () => fetchApi<FaceTokenResponse>("/employees/face/token"),
    updateFaceDescriptor: (userId: string, descriptor: number[]) =>
      fetchApi<User>(`/sessions/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ faceDescriptor: descriptor }),
      }),
    verifyFaceWithToken: (token: string, descriptor: number[]) =>
      fetchApi<VerifyFaceResponse>("/employees/face/verify", {
        method: "POST",
        body: JSON.stringify({ token, descriptor }),
        skipAuthRedirect: true, // 401 aqui significa token facial inválido, não sessão expirada
      }),
  },

  checkins: {
    create: (data: CheckinCreateDto) =>
      fetchApi<CheckinCreateResponse>("/checkins", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    syncOffline: (items: Array<{
      id: string;
      type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
      timestamp: string;
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      hash?: string;
    }>) =>
      fetchApi<{
        message: string;
        synced: Array<{
          id: string;
          status: string;
          checkinId: string;
          nsr: number;
          comprovante?: string;
        }>;
      }>("/checkins/sync-offline", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    list: (date?: string) =>
      fetchApi<CheckinResponse[]>(`/checkins${date ? `?date=${date}` : ""}`),
    listByCompany: (date?: string) =>
      fetchApi<CompanyCheckinEmployee[]>(`/checkins/company${date ? `?date=${date}` : ""}`),
    exportAfd: (startDate: string, endDate: string) =>
      fetchApi<Blob>(`/checkins/export/afd?startDate=${startDate}&endDate=${endDate}`, {
        responseType: "blob",
      }),
    exportAej: (startDate: string, endDate: string) =>
      fetchApi<Blob>(`/checkins/export/aej?startDate=${startDate}&endDate=${endDate}`, {
        responseType: "blob",
      }),
    exportRelatorioMensal: (year: number, month: number, format: "csv" | "pdf" = "csv") =>
      fetchApi<Blob>(`/checkins/export/relatorio-mensal?year=${year}&month=${month}&format=${format}`, {
        responseType: "blob",
      }),
  },

  master: {
    listCompanies: (params?: MasterListParams) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.status) searchParams.set("status", params.status);
      if (params?.plan) searchParams.set("plan", params.plan);
      if (params?.search) searchParams.set("search", params.search);
      return fetchApi<MasterCompaniesResponse>(
        `/master/companies?${searchParams.toString()}`
      );
    },
    exportCompanies: (params?: { status?: CompanyStatus; plan?: PlanTier; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.plan) searchParams.set("plan", params.plan);
      if (params?.search) searchParams.set("search", params.search);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return fetchApi<Blob>(`/master/companies/export${query}`, { responseType: "blob" });
    },
    listAuditLogs: (params?: MasterAuditLogParams) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.action) searchParams.set("action", params.action);
      if (params?.entity) searchParams.set("entity", params.entity);
      if (params?.companyId) searchParams.set("companyId", params.companyId);
      if (params?.userId) searchParams.set("userId", params.userId);
      if (params?.search) searchParams.set("search", params.search);
      if (params?.from) searchParams.set("from", params.from);
      if (params?.to) searchParams.set("to", params.to);
      return fetchApi<MasterAuditLogsResponse>(`/master/audit-logs?${searchParams.toString()}`);
    },
    getCompany: (id: string) => fetchApi<MasterCompanyDetail>(`/master/companies/${id}`),
    getMetrics: (params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return fetchApi<MasterMetricsResponse>(`/master/metrics${suffix}`);
    },
    updatePlan: (
      id: string,
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
    ) =>
      fetchApi<{
        id: string;
        name: string;
        plan: PlanTier;
        status: string;
        maxEmployees: number;
        price?: number;
        calculatedTotal?: number;
        basePrice?: number;
        extraPricePerUnit?: number;
        pricingModel?: "FIXED" | "TIERED_EXTRA";
      }>(`/master/companies/${id}/plan`, {
        method: "PUT",
        body: JSON.stringify(typeof data === "string" ? { plan: data } : data),
      }),
    updateStatus: (id: string, status: CompanyStatus) =>
      fetchApi<{ company: Company }>(`/master/companies/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    extendTrial: (id: string, days: number) =>
      fetchApi<{ company: Company }>(`/master/companies/${id}/extend-trial`, {
        method: "POST",
        body: JSON.stringify({ days }),
      }),
    impersonate: (companyId: string) =>
      fetchApi<{ token: string; user: User; expiresIn: number }>(`/master/companies/${companyId}/impersonate`, {
        method: "POST",
      }),
  },

  privacy: {
    getMyData: () =>
      fetchApi<MyDataResponse>("/privacy/my-data"),

    updateMyData: (data: { name?: string; email?: string }) =>
      fetchApi<{ message: string; user: { id: string; name: string; email: string } }>(
        "/privacy/my-data",
        { method: "PUT", body: JSON.stringify(data) }
      ),

    exportMyData: () =>
      fetchApi<unknown>("/privacy/export"),

    deleteMyFace: () =>
      fetchApi<{ message: string }>("/privacy/my-face", {
        method: "DELETE",
      }),

    getMyLogs: () =>
      fetchApi<{ logs: AuditLogEntry[] }>("/privacy/my-logs"),
  },

  consent: {
    list: () =>
      fetchApi<ConsentimentoResponse[]>("/consentimentos"),
  },

  payments: {
    createCheckout: (data: { billingType: string }) =>
      fetchApi<CheckoutResponse>("/companies/payments/checkout", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getHistory: (sync?: boolean) =>
      fetchApi<PaymentHistoryItem[]>(`/companies/payments/history${sync ? "?sync=true" : ""}`),
    cancel: () =>
      fetchApi<{ message: string }>("/companies/payments/cancel", {
        method: "POST",
      }),
    retry: (billingType: string = "PIX") =>
      fetchApi<{ paymentId: string; amount: number; billingType: string; dueDate: string; paymentUrl: string | null }>(
        "/companies/payments/retry",
        {
          method: "POST",
          body: JSON.stringify({ billingType }),
        }
      ),
  },

  justificativa: {
    create: (body: JustificativaCreateBody) =>
      fetchApi<{ message: string; justificativa: JustificativaResponse }>("/justificativas", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    list: (params?: { status?: string; tipo?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.tipo) searchParams.set("tipo", params.tipo);
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return fetchApi<JustificativaResponse[]>(`/justificativas${qs}`);
    },

    approve: (id: string, aprovado: boolean, motivoRecusa?: string) =>
      fetchApi<{ message: string; justificativa: JustificativaResponse }>(`/justificativas/${id}/aprovar`, {
        method: "PUT",
        body: JSON.stringify({ aprovado, motivoRecusa }),
      }),

    getComprovanteUrl: (id: string) => `${API_URL}/justificativas/${id}/comprovante`,
  },

  workSchedules: {
    list: () =>
      fetchApi<WorkScheduleResponse[]>("/work-schedules"),

    create: (body: WorkScheduleCreateBody) =>
      fetchApi<WorkScheduleResponse>("/work-schedules", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: string, body: Partial<WorkScheduleCreateBody>) =>
      fetchApi<WorkScheduleResponse>(`/work-schedules/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    remove: (id: string) =>
      fetchApi<void>(`/work-schedules/${id}`, {
        method: "DELETE",
      }),

    assignToEmployee: (employeeId: string, workScheduleId: string | null) =>
      fetchApi<{ id: string; name: string; workScheduleId: string | null }>("/work-schedules/assign", {
        method: "POST",
        body: JSON.stringify({ employeeId, workScheduleId }),
      }),
  },

  workLocations: {
    list: () =>
      fetchApi<WorkLocationResponse[]>("/work-locations"),

    create: (body: WorkLocationCreateBody) =>
      fetchApi<{ message: string; polo: WorkLocationResponse }>("/work-locations", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: string, body: Partial<WorkLocationCreateBody> & { ativo?: boolean }) =>
      fetchApi<{ message: string; polo: WorkLocationResponse }>(`/work-locations/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    remove: (id: string) =>
      fetchApi<{ message: string; removido?: boolean; desativado?: boolean }>(`/work-locations/${id}`, {
        method: "DELETE",
      }),
  },

  totem: {
    activate: (pin: string) =>
      fetchApi<{ totemToken: string; expiresIn: number }>("/totem/companies/me/totem/activate", {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),

    deactivate: (pin: string) =>
      fetchApi<{ message: string }>("/totem/companies/me/totem/deactivate", {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),

    recover: (email: string, password: string) =>
      fetchApi<{ message: string }>("/totem/recover", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
        totemToken: true,
      }),

    verify: (email: string, password: string) =>
      fetchApi<TotemVerifyResponse>("/totem/verify", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
        totemToken: true,
      }),

    checkin: (data: TotemCheckinDto) =>
      fetchApi<TotemCheckinResponse>("/totem/checkin", {
        method: "POST",
        body: JSON.stringify(data),
        requiresAuth: false,
        totemToken: true,
      }),

    verifyFace: (token: string, descriptor: number[]) =>
      fetchApi<VerifyFaceResponse>("/totem/face/verify", {
        method: "POST",
        body: JSON.stringify({ token, descriptor }),
        requiresAuth: false,
        totemToken: true,
      }),

    registerFace: (userId: string, descriptor: number[]) =>
      fetchApi<{ message: string }>("/totem/face/register", {
        method: "POST",
        body: JSON.stringify({ userId, descriptor }),
        requiresAuth: false,
        totemToken: true,
      }),

    recoverWithAdminFace: (descriptor: number[]) =>
      fetchApi<{ success: boolean; adminName?: string; message: string; distance?: number }>("/totem/recover/face", {
        method: "POST",
        body: JSON.stringify({ descriptor }),
        requiresAuth: false,
        totemToken: true,
        skipAuthRedirect: true,
      }),

    sendRecoveryCode: () =>
      fetchApi<{ message: string; emailMasked: string }>("/totem/recover/code/send", {
        method: "POST",
        requiresAuth: false,
        totemToken: true,
        skipAuthRedirect: true,
      }),

    verifyRecoveryCode: (code: string) =>
      fetchApi<{ success: boolean; message: string }>("/totem/recover/code/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
        requiresAuth: false,
        totemToken: true,
        skipAuthRedirect: true,
      }),
  },

  espelhos: {
    liberarFechamento: (year: number, month: number, userId?: string) =>
      fetchApi<{
        message: string;
        totalColaboradores: number;
        espelhosCriados: number;
        espelhosAtualizados: number;
      }>("/espelhos/fechamento", {
        method: "POST",
        body: JSON.stringify({ year, month, userId }),
      }),

    listarEmpresa: (year?: number, month?: number) => {
      const searchParams = new URLSearchParams();
      if (year) searchParams.set("year", year.toString());
      if (month) searchParams.set("month", month.toString());
      const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return fetchApi<ListarEspelhosEmpresaResponse>(`/espelhos/empresa${query}`);
    },

    listarMeus: () =>
      fetchApi<MeuEspelhoItem[]>("/espelhos/me"),

    obterDetalhes: (id: string) =>
      fetchApi<EspelhoPontoDetalheResponse>(`/espelhos/${id}`),

    assinar: (id: string, password: string) =>
      fetchApi<{ message: string; espelho: EspelhoPontoDetalheResponse }>(`/espelhos/${id}/assinar`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),

    contestar: (id: string, motivo: string) =>
      fetchApi<{ message: string; espelho: EspelhoPontoDetalheResponse }>(`/espelhos/${id}/contestar`, {
        method: "POST",
        body: JSON.stringify({ motivo }),
      }),

    downloadPdfUrl: (id: string) => `${API_URL}/espelhos/${id}/pdf`,
  },
};

export type EspelhoStatus = "LIBERADO" | "ASSINADO" | "CONTESTADO" | "NAO_GERADO";

export interface DiaEspelhoItem {
  data: string;
  diaNumero: string;
  diaSemana: string;
  entrada: string;
  saidaAlmoco: string;
  retornoAlmoco: string;
  saida: string;
  horasTrabalhadas: string;
  horasExtras: string;
  observacoes: string;
}

export interface ResumoHorasEspelhoItem {
  totalMinutosTrabalhados: number;
  totalMinutosExtras: number;
  totalDiasTrabalhados: number;
  horasTrabalhadasFormatadas: string;
  horasExtrasFormatadas: string;
}

export interface MeuEspelhoItem {
  id: string;
  ano: number;
  mes: number;
  status: EspelhoStatus;
  resumoHoras: ResumoHorasEspelhoItem;
  assinadoEm: string | null;
  motivoRecusa: string | null;
  createdAt: string;
}

export interface ItemEspelhoEmpresa {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  hasEspelho: boolean;
  status: EspelhoStatus;
  resumoHoras?: ResumoHorasEspelhoItem;
  assinadoEm?: string | null;
  motivoRecusa?: string | null;
  updatedAt?: string;
}

export interface ListarEspelhosEmpresaResponse {
  year: number;
  month: number;
  totalColaboradores: number;
  stats: {
    total: number;
    assinados: number;
    pendentes: number;
    contestados: number;
    naoGerados: number;
    percentualAssinado: number;
  };
  items: ItemEspelhoEmpresa[];
}

export interface EspelhoPontoDetalheResponse {
  id: string;
  companyId: string;
  userId: string;
  ano: number;
  mes: number;
  periodoInicio: string;
  periodoFim: string;
  status: EspelhoStatus;
  hashDocumento: string;
  resumoHoras: ResumoHorasEspelhoItem;
  detalhesDias: DiaEspelhoItem[];
  assinadoEm: string | null;
  ipAssinatura: string | null;
  userAgent: string | null;
  metodoAuth: string | null;
  motivoRecusa: string | null;
  dataContestacao: string | null;
  user?: { name: string; email: string; cpf: string | null };
  company?: { name: string; cnpj: string };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  cpf?: string;
  createdAt: string;
  hasFaceDescriptor?: boolean;
  mustChangePassword?: boolean;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  plan: PlanTier;
  status: CompanyStatus;
  planExpiresAt: string | null;
  maxEmployees: number;
  settings: CompanySettings;
  trialUsed: boolean;
  createdAt: string;
}

export interface CompanySettings {
  logo?: string | null;
  primaryColor?: string;
  timezone?: string;
  checkinToleranceMinutes?: number;
  lunchToleranceMinutes?: number;
  requirePhoto?: boolean;
  requireBiometry?: boolean;
}

export interface SignupCompanyDto {
  name: string;
  email: string;
  cpf: string;
  cnpj: string;
  companyName: string;
  password: string;
  confirmPassword: string;
  aceiteContratos?: boolean;
  aceiteTermos?: boolean;
  aceiteBiometria?: boolean;
  aceiteDpa?: boolean;
}

export const FacialValidationMode = {
  FRONTAL_ONLY: "FRONTAL_ONLY",
  FULL_LIVENESS: "FULL_LIVENESS",
} as const;
export type FacialValidationMode = typeof FacialValidationMode[keyof typeof FacialValidationMode];

export const TotemAuthMode = {
  CREDENTIALS_ONLY: "CREDENTIALS_ONLY",
  FRONTAL_ONLY: "FRONTAL_ONLY",
  FULL_LIVENESS: "FULL_LIVENESS",
} as const;
export type TotemAuthMode = typeof TotemAuthMode[keyof typeof TotemAuthMode];

export interface CompanySettings {
  ponto?: {
    facialMode?: FacialValidationMode;
    requirePhoto?: boolean;
    requireBiometry?: boolean;
    checkinToleranceMinutes?: number;
    lunchToleranceMinutes?: number;
  };
  totem?: {
    authMode?: TotemAuthMode;
  };
  [key: string]: unknown;
}

export interface SignupCompanyResponse {
  user: User;
  company: Company;
  token: string;
}

export interface CompanyResponse {
  id: string;
  name: string;
  cnpj: string;
  plan: PlanTier;
  status: CompanyStatus;
  planExpiresAt: string | null;
  maxEmployees: number;
  currentEmployees: number;
  employeeUsagePercent: number;
  canCreateEmployee: boolean;
  billingType: string | null;
  asaasPaymentMethod: string | null;
  settings: CompanySettings;
  trialUsed: boolean;
  totemActive: boolean;
  createdAt: string;
  pricing: {
    basePrice: number;
    baseMaxEmployees: number;
    paidEmployees: number;
    extraEmployees: number;
    extraPricePerUnit: number;
    extraTotal: number;
    total: number;
  };
}

export interface UpdateCompanyDto {
  name?: string;
  settings?: Partial<CompanySettings>;
}

export interface UsageResponse {
  employees: {
    current: number;
    limit: number;
    percentage: number;
    users: User[]
  };
  checkins: {
    thisMonth: number;
    total: number;
  };
  apiLimits: {
    general: number;
    checkin: number;
    faceValidation: number;
  };
  plan: PlanTier;
  pricing: {
    basePrice: number;
    baseMaxEmployees: number;
    paidEmployees: number;
    extraEmployees: number;
    extraPricePerUnit: number;
    extraTotal: number;
    total: number;
  };
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  billingType: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  paymentUrl: string | null;
  nfseStatus: 'PENDING' | 'ISSUED' | 'NOT_APPLICABLE';
  nfseNumber: string | null;
  nfseUrl: string | null;
}

export interface CheckoutResponse {
  subscriptionId: string;
  billingType: string;
  amount: number;
  paymentUrl: string;
}

export interface CreateInviteTokenDto {
  expiresInDays?: number;
  maxUses?: number | null;
}

export interface InviteTokenResponse {
  id: string;
  token: string;
  tokenMasked: string;
  inviteUrl: string;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  isActive: boolean;
  usedByUsers: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }[];
}

export interface PublicInviteResponse {
  company: {
    id: string;
    name: string;
    plan: PlanTier;
    settings: CompanySettings;
  };
  expiresAt: string;
  maxUses: number | null;
  currentUses: number;
}

export interface AcceptInviteDto {
  token: string;
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  aceiteContratos?: boolean;
  aceiteTermos?: boolean;
  aceiteBiometria: boolean;
  aceiteDpa?: boolean;
}

export interface MasterListParams {
  page?: number;
  limit?: number;
  status?: CompanyStatus;
  plan?: PlanTier;
  search?: string;
}

export interface MasterCompaniesResponse {
  data: MasterCompanyListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MasterHealthScoreBreakdown {
  score: number;
  level: "HEALTHY" | "WARNING" | "CRITICAL";
  breakdown: {
    colaboradores: { score: number; max: number; passed: boolean; message: string };
    atividade: { score: number; max: number; passed: boolean; message: string };
    biometria: { score: number; max: number; passed: boolean; message: string };
    financeiro: { score: number; max: number; passed: boolean; message: string };
    gestao: { score: number; max: number; passed: boolean; message: string };
  };
}

export interface MasterPaymentItem {
  id: string;
  amount: number;
  billingType: string;
  status: string;
  paymentUrl: string | null;
  invoiceUrl: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  asaasPaymentId: string | null;
}

export interface MasterCompanyListItem {
  id: string;
  name: string;
  cnpj: string;
  plan: PlanTier;
  status: CompanyStatus;
  planExpiresAt: string | null;
  maxEmployees: number;
  employeesCount: number;
  employeeUsagePercent: number;
  settings?: CompanySettings;
  createdAt: string;
  healthScore?: number | MasterHealthScoreBreakdown;
  healthLevel?: "HEALTHY" | "WARNING" | "CRITICAL";
  pricing: {
    basePrice: number;
    baseMaxEmployees: number;
    paidEmployees: number;
    extraEmployees: number;
    extraPricePerUnit: number;
    extraTotal: number;
    total: number;
  } | null;
}

export interface MasterCompanyDetail extends MasterCompanyListItem {
  users: User[];
  subscriptions: Subscription[];
  payments: MasterPaymentItem[];
  employeesCount: number;
  checkinsCount: number;
  subscriptionsCount: number;
  healthScore?: MasterHealthScoreBreakdown;
  lastCheckinAt?: string | null;
  recentCheckins3d?: number;
  recentCheckins7d?: number;
}

export interface MasterAuditLogParams {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  companyId?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface MasterAuditLogItem {
  id: string;
  userId: string;
  companyId: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  legalBasis: string | null;
  purpose: string | null;
  personalDataCategories: string[] | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string } | null;
  company?: { id: string; name: string; cnpj: string } | null;
}

export interface MasterAuditLogsResponse {
  data: MasterAuditLogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MasterRiskAlerts {
  total: number;
  stalledOnboarding: {
    count: number;
    list: {
      id: string;
      name: string;
      cnpj: string;
      createdAt: string;
      adminName: string | null;
      adminEmail: string | null;
    }[];
  };
  noRecentCheckins: {
    count: number;
    list: {
      id: string;
      name: string;
      cnpj: string;
      status: string;
      employeesCount: number;
      adminName: string | null;
      adminEmail: string | null;
    }[];
  };
  inactiveAdmins: {
    count: number;
    list: {
      id: string;
      name: string;
      cnpj: string;
      adminName: string | null;
      adminEmail: string | null;
      lastLoginAt: string | null;
      daysSinceLogin: number | null;
    }[];
  };
  expiringTrials: {
    count: number;
    list: {
      id: string;
      name: string;
      cnpj: string;
      planExpiresAt: string;
      daysRemaining: number;
      adminName: string | null;
      adminEmail: string | null;
    }[];
  };
  overduePayments: {
    count: number;
    list: {
      id: string;
      name: string;
      cnpj: string;
      status: string;
      overdueCount: number;
      totalOverdueAmount: number;
      adminName: string | null;
      adminEmail: string | null;
    }[];
  };
}

export interface Subscription {
  id: string;
  companyId: string;
  planTier: PlanTier;
  price: number;
  status: string;
  asaasSubscriptionId: string | null;
  billingType: string | null;
  paymentMethod: string | null;
  basePrice: number | null;
  extraEmployees: number | null;
  extraPricePerUnit: number | null;
  calculatedTotal: number | null;
  nfseStatus: string | null;
  nfseNumber: string | null;
  nfseUrl: string | null;
  startedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface MasterMetricsResponse {
  companies: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    cancelled: number;
  };
  users: {
    total: number;
  };
  checkins: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  revenue: {
    mrr: number;
    planDistribution: Record<PlanTier, number>;
  };
  churn: {
    rate: number;
    cancelled: number;
  };
  acquisition?: {
    views: number;
    uniques: number;
    byDay: { date: string; views: number; uniques: number }[];
    bySource: { utmSource: string; views: number; uniques: number }[];
  };
  conversion?: {
    companiesCreated: number;
    rate: number;
    byDay: { date: string; count: number }[];
  };
  funnel?: { step: string; label: string; count: number }[];
  riskAlerts?: MasterRiskAlerts;
  range?: { from: string; to: string };
}

export interface FaceDescriptorResponse {
  [key: string]: number;
}

export interface FaceTokenResponse {
  token: string;
  expiresIn: number;
}

export interface VerifyFaceResponse {
  success: boolean;
  distance: number;
  message?: string;
}

export interface CheckinCreateDto {
  type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  geolocationDenied?: boolean;
  geolocationConsent?: boolean | null;
  address?: string | null;
}

export interface CheckinResponse {
  id: string;
  createdAt: string;
  type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  latitude: number | null;
  longitude: number | null;
  geolocationAccuracy?: number | null;
  geolocationDenied?: boolean;
  geolocationConsent?: boolean | null;
  address?: string | null;
  workLocationId?: string | null;
  distanciaMetros?: number | null;
  dentroDoRaio?: boolean | null;
  workLocation?: { id: string; nome: string; raioMetros: number } | null;
  userId: string;
  companyId: string;
}

export interface CheckinCreateResponse {
  checkin: {
    checkin: CheckinResponse;
  };
  comprovante: string;
  hashVerificacao: string;
}

export interface CompanyCheckinEmployee {
  employeeId: string;
  employeeName: string;
  checkins: {
    id: string;
    createdAt: string;
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
    latitude: number | null;
    longitude: number | null;
  }[];
}

export interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  faceDescriptor: Record<string, number> | null;
  workScheduleId: string | null;
  createdAt: string;
  updatedAt: string;
  checkins: {
    id: string;
    createdAt: string;
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
    latitude: number;
    longitude: number;
  }[];
}

export type UserRole = "MASTER" | "ENTERPRISE_ADMIN" | "EMPLOYEE";
export type PlanTier = "DYNAMIC" | "ENTERPRISE_CUSTOM";
export type CompanyStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

export interface MyDataResponse {
  dadosPessoais: {
    id: string;
    nome: string;
    email: string;
    cpf: string | null;
    cargo: string;
    dataCadastro: string;
    ultimoLogin: string | null;
  };
  dadosBiometricos: {
    possuiDescriptor: boolean;
    dimensoes: number;
    observacao: string;
  };
  registrosPonto: {
    id: string;
    nsr: number;
    createdAt: string;
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
    latitude: number;
    longitude: number;
    address: string | null;
  }[];
  consentimentos: ConsentimentoResponse[];
}

export interface ConsentimentoResponse {
  tipo: string;
  versao: string;
  aceite: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  ip: string | null;
  legalBasis: string | null;
  purpose: string | null;
  personalDataCategories: string[] | null;
}

export type JustificativaTipo =
  | "ESQUECIMENTO_PONTO"
  | "ATESTADO_MEDICO"
  | "DECLARACAO_COMPARECIMENTO"
  | "ABONO_FALTA"
  | "OUTRO"
  | "ABONO"
  | "FALTA"
  | "ATESTADO"
  | "JUSTIFICATIVA_GERAL";

export interface JustificativaArquivoDto {
  nomeOriginal: string;
  mimeType: string;
  conteudoBase64: string;
}

export interface JustificativaCreateBody {
  tipo: JustificativaTipo;
  descricao: string;
  dataInicio: string;
  dataFim?: string;
  horarioAjustado?: string;
  tipoBatidaAjuste?: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  diasAfastamento?: number;
  checkinId?: string;
  arquivo?: JustificativaArquivoDto;
}

export interface JustificativaResponse {
  id: string;
  userId: string;
  companyId: string;
  tipo: JustificativaTipo;
  descricao: string;
  dataInicio: string;
  dataFim: string | null;
  horarioAjustado: string | null;
  tipoBatidaAjuste: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT" | null;
  diasAfastamento: number | null;
  motivoRecusa: string | null;
  comprovantePath: string | null;
  comprovanteNomeOriginal: string | null;
  comprovanteTamanho: number | null;
  comprovanteMimeType: string | null;
  comprovante: string | null;
  aprovado: boolean | null;
  aprovadoPor: string | null;
  checkinId: string | null;
  user?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export type JornadaTipo = "5x2" | "6x1" | "12x36";

export interface WorkScheduleCreateBody {
  name: string;
  entryTime: number;
  lunchStart: number;
  lunchEnd: number;
  exitTime: number;
  daysOfWeek?: number;
  jornadaTipo: JornadaTipo;
  checkinToleranceMinutes?: number;
  lunchToleranceMinutes?: number;
}

export interface WorkScheduleResponse {
  id: string;
  companyId: string;
  name: string;
  entryTime: number;
  lunchStart: number;
  lunchEnd: number;
  exitTime: number;
  daysOfWeek: number;
  jornadaTipo: JornadaTipo;
  checkinToleranceMinutes: number;
  lunchToleranceMinutes: number;
  _count: { users: number };
  createdAt: string;
  updatedAt: string;
}

export interface TotemVerifyResponse {
  faceToken: string;
  expiresIn: number;
  userId: string;
  userName: string;
  totemAuthMode?: TotemAuthMode;
  checkinsToday?: Array<{
    id: string;
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
    createdAt: string;
  }>;
}

export interface TotemCheckinDto {
  userId: string;
  type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  latitude: number;
  longitude: number;
  faceToken: string;
}

export interface TotemCheckinResponse {
  checkin: {
    checkin: CheckinResponse;
  };
  comprovante: string;
  hashVerificacao: string;
}

export interface WorkLocationCreateBody {
  nome: string;
  endereco?: string;
  latitude: number;
  longitude: number;
  raioMetros?: number;
}

export interface WorkLocationResponse {
  id: string;
  companyId: string;
  nome: string;
  endereco: string | null;
  latitude: number;
  longitude: number;
  raioMetros: number;
  ativo: boolean;
  _count?: { checkIns: number };
  createdAt: string;
  updatedAt: string;
}
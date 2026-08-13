import { API_URL } from "../utils/api";

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  totemToken?: boolean;
  responseType?: "json" | "blob";
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
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requiresAuth = true, totemToken = false, responseType = "json", headers = {}, ...restOptions } = options;

  const token = totemToken
    ? localStorage.getItem("@viggo:totem")
    : requiresAuth
      ? localStorage.getItem("@viggo:token")
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
    if (totemToken) {
      localStorage.removeItem("@viggo:totem");
      window.location.href = "/";
      return new Promise<T>(() => { }) as Promise<T>;
    }
    localStorage.removeItem("@viggo:token");
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
      fetchApi<{ user: User; token: string; company: string }>("/sessions/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      }),

    me: () => fetchApi<{ user: User }>("/auth/me"),

    signup: (data: SignupCompanyDto) =>
      fetchApi<SignupCompanyResponse>("/companies/signup", {
        method: "POST",
        body: JSON.stringify(data),
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
      }),
  },

  checkins: {
    create: (data: CheckinCreateDto) =>
      fetchApi<CheckinCreateResponse>("/checkins", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (date?: string) =>
      fetchApi<CheckinResponse[]>(`/checkins${date ? `?date=${date}` : ""}`),
    listByCompany: (date?: string) =>
      fetchApi<CompanyCheckinEmployee[]>(`/checkins/company${date ? `?date=${date}` : ""}`),
    exportAfd: (startDate: string, endDate: string) =>
      fetchApi<Blob>(`/checkins/export/afd?startDate=${startDate}&endDate=${endDate}`, {
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
    getCompany: (id: string) => fetchApi<MasterCompanyDetail>(`/master/companies/${id}`),
    getMetrics: () => fetchApi<MasterMetricsResponse>("/master/metrics"),
    updatePlan: (id: string, plan: PlanTier) =>
      fetchApi<{ company: Company }>(`/master/companies/${id}/plan`, {
        method: "PUT",
        body: JSON.stringify({ plan }),
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
    getHistory: () =>
      fetchApi<PaymentHistoryItem[]>("/companies/payments/history"),
    cancel: () =>
      fetchApi<{ message: string }>("/companies/payments/cancel", {
        method: "POST",
      }),
  },

  justificativa: {
    create: (body: JustificativaCreateBody) =>
      fetchApi<JustificativaResponse>("/justificativas", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    list: () =>
      fetchApi<(JustificativaResponse & { user?: { id: string; name: string; email: string } })[]>("/justificativas"),

    approve: (id: string, aprovado: boolean) =>
      fetchApi<JustificativaResponse>(`/justificativas/${id}/aprovar`, {
        method: "PUT",
        body: JSON.stringify({ aprovado }),
      }),
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
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  cpf?: string;
  createdAt: string;
  hasFaceDescriptor?: boolean;
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
  aceiteTermos: boolean;
  aceiteBiometria: boolean;
  aceiteDpa: boolean;
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
  aceiteTermos: boolean;
  aceiteBiometria: boolean;
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
  settings: CompanySettings;
  createdAt: string;
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
  employeesCount: number;
  checkinsCount: number;
  subscriptionsCount: number;
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
  latitude: number;
  longitude: number;
}

export interface CheckinResponse {
  id: string;
  createdAt: string;
  type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  latitude: number;
  longitude: number;
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
    latitude: number;
    longitude: number;
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

export type JustificativaTipo = "ABONO" | "FALTA" | "ATESTADO" | "JUSTIFICATIVA_GERAL";

export interface JustificativaCreateBody {
  tipo: JustificativaTipo;
  descricao: string;
  dataInicio: string;
  dataFim?: string;
  checkinId?: string;
}

export interface JustificativaResponse {
  id: string;
  userId: string;
  companyId: string;
  tipo: JustificativaTipo;
  descricao: string;
  dataInicio: string;
  dataFim: string | null;
  comprovante: string | null;
  aprovado: boolean | null;
  aprovadoPor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleCreateBody {
  name: string;
  entryTime: number;
  lunchStart: number;
  lunchEnd: number;
  exitTime: number;
  daysOfWeek?: number;
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
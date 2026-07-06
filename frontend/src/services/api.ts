import { API_URL } from "../utils/api";

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const token = requiresAuth ? localStorage.getItem("@viggo:token") : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("@viggo:token");
    window.location.href = "/";
    return new Promise<T>(() => { }) as Promise<T>;
  }

  if (response.status === 403) {
    const error = await response.json().catch(() => ({}));
    if (error.code === "FACE_NOT_REGISTERED") {
      window.location.href = "/register";
      return new Promise<T>(() => { }) as Promise<T>;
    }
    throw new Error(error.message || `Erro ${response.status}`);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro na requisição" }));
    throw new Error(error.message || `Erro ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
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
    getFaceDescriptor: () => fetchApi<FaceDescriptorResponse>("/employees/face"),
    updateFaceDescriptor: (userId: string, descriptor: number[]) =>
      fetchApi<User>(`/sessions/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ faceDescriptor: descriptor }),
      }),
    verifyFace: (descriptor: number[]) =>
      fetchApi<VerifyFaceResponse>("/employees/face/verify", {
        method: "POST",
        body: JSON.stringify({ descriptor }),
      }),
  },

  checkins: {
    create: (data: CheckinCreateDto) =>
      fetchApi<CheckinResponse>("/checkins", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (date?: string) =>
      fetchApi<CheckinResponse[]>(`/checkins${date ? `?date=${date}` : ""}`),
    listByCompany: (date?: string) =>
      fetchApi<CompanyCheckinEmployee[]>(`/checkins/company${date ? `?date=${date}` : ""}`),
    listMonthly: (year: number, month: number) =>
      fetchApi<MonthlyCheckinEmployee[]>(`/checkins/month?year=${year}&month=${month}`),
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
    updatePlan: (id: string, planTier: PlanTier) =>
      fetchApi<{ company: Company }>(`/master/companies/${id}/plan`, {
        method: "PUT",
        body: JSON.stringify({ planTier }),
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
  cnpj: string | null;
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
  cnpj?: string;
  companyName: string;
  password: string;
  confirmPassword: string;
}

export interface SignupCompanyResponse {
  user: User;
  company: Company;
  token: string;
}

export interface CompanyResponse {
  id: string;
  name: string;
  cnpj: string | null;
  plan: PlanTier;
  status: CompanyStatus;
  planExpiresAt: string | null;
  maxEmployees: number;
  currentEmployees: number;
  employeeUsagePercent: number;
  canCreateEmployee: boolean;
  settings: CompanySettings;
  trialUsed: boolean;
  createdAt: string;
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
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MasterCompanyListItem {
  id: string;
  name: string;
  cnpj: string | null;
  plan: PlanTier;
  status: CompanyStatus;
  planExpiresAt: string | null;
  maxEmployees: number;
  employeesCount: number;
  employeeUsagePercent: number;
  settings: CompanySettings;
  createdAt: string;
}

export interface MasterCompanyDetail extends MasterCompanyListItem {
  users: User[];
  subscriptions: Subscription[];
}

export interface Subscription {
  id: string;
  companyId: string;
  planTier: PlanTier;
  price: number;
  status: string;
  asaasSubscriptionId: string | null;
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

export interface MonthlyCheckinEmployee {
  employeeId: string;
  employeeName: string;
  checkins: {
    id: string;
    createdAt: string;
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  }[];
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

export type UserRole = "MASTER" | "ENTERPRISE_ADMIN" | "EMPLOYEE";
export type PlanTier = "TIER_I" | "TIER_II" | "TIER_III" | "ENTERPRISE_CUSTOM";
export type CompanyStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
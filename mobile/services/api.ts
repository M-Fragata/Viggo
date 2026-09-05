import * as SecureStore from 'expo-secure-store';

export const API_URL = 'https://pontofragata.com.br';

const TOKEN_KEY = '@fragata:token';
const USER_KEY = '@fragata:user';
const TOTEM_KEY = '@fragata:totem';
const TOTEM_EXP_KEY = '@fragata:totem:expiresAt';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN' | 'ENTERPRISE_ADMIN' | 'MASTER';
  companyId: string;
  companyName?: string;
  hasFaceRegistered?: boolean;
}

export interface CheckInItem {
  id: string;
  nsr: number;
  ano: number;
  type: 'ENTRY' | 'EXIT' | 'INTERVAL_ENTRY' | 'INTERVAL_EXIT';
  createdAt: string;
  address?: string;
  geolocationAccuracy?: number;
  comprovante?: string;
  workLocationId?: string | null;
  distanciaMetros?: number | null;
  dentroDoRaio?: boolean | null;
  workLocation?: { id: string; nome: string; raioMetros: number } | null;
}

export interface TotemVerifyResponse {
  faceToken: string;
  expiresIn: number;
  userId: string;
  userName: string;
  totemAuthMode?: 'CREDENTIALS_ONLY' | 'FRONTAL_ONLY' | 'FULL_LIVENESS';
  checkinsToday?: Array<{ id: string; type: 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT'; createdAt: string }>;
}

export interface TotemCheckinDto {
  userId: string;
  type: 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT';
  latitude: number;
  longitude: number;
  faceToken: string;
}

export interface TotemCheckinResponse {
  checkin: { checkin: CheckInItem };
  comprovante: string;
  hashVerificacao: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: any;

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// Secure Storage helpers
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser(): Promise<UserSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: UserSession): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

// Totem Storage Helpers
export async function getStoredTotemToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOTEM_KEY);
    const exp = await SecureStore.getItemAsync(TOTEM_EXP_KEY);
    if (!token) return null;
    if (exp && Number(exp) < Date.now()) {
      await removeStoredTotemToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export async function setStoredTotemToken(token: string, expiresInSeconds: number): Promise<void> {
  await SecureStore.setItemAsync(TOTEM_KEY, token);
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  await SecureStore.setItemAsync(TOTEM_EXP_KEY, String(expiresAt));
}

export async function removeStoredTotemToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOTEM_KEY);
    await SecureStore.deleteItemAsync(TOTEM_EXP_KEY);
  } catch {}
}

// Request Helper
interface RequestOptions extends RequestInit {
  useTotemToken?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { useTotemToken, ...restOptions } = options;
  const token = useTotemToken ? await getStoredTotemToken() : await getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(restOptions.headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...restOptions,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      err.message || 'Falha de conexão com o servidor. Verifique sua internet.',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || `Erro ${response.status}: Falha na requisição`;
    throw new ApiError(message, response.status, data.code, data);
  }

  return data as T;
}

// API Methods
export const api = {
  async login(emailOrCpf: string, password: string): Promise<{ token: string; user: UserSession }> {
    const isEmail = emailOrCpf.includes('@');
    const payload = isEmail
      ? { email: emailOrCpf.trim(), password }
      : { cpf: emailOrCpf.replace(/\D/g, ''), password };

    const data = await request<{ token: string; user: UserSession }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await setStoredToken(data.token);
    await setStoredUser(data.user);
    return data;
  },

  async companySignup(params: {
    name: string;
    email: string;
    cpf: string;
    cnpj: string;
    companyName: string;
    password: string;
    confirmPassword: string;
    aceiteContratos: boolean;
  }): Promise<{ token: string; user: UserSession }> {
    const data = await request<{ token: string; user: UserSession; company: any }>('/companies/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name.trim(),
        email: params.email.trim(),
        cpf: params.cpf.replace(/\D/g, ''),
        cnpj: params.cnpj.replace(/\D/g, ''),
        companyName: params.companyName.trim(),
        password: params.password,
        confirmPassword: params.confirmPassword,
        aceiteContratos: params.aceiteContratos,
      }),
    });

    await setStoredToken(data.token);
    await setStoredUser(data.user);
    return { token: data.token, user: data.user };
  },

  async getMe(): Promise<UserSession> {
    const data = await request<{ user: UserSession }>('/auth/me');
    await setStoredUser(data.user);
    return data.user;
  },

  async registerCheckIn(params: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    faceDescriptor?: number[];
    photoBase64?: string;
  }): Promise<{ message: string; checkIn: CheckInItem; comprovante?: string }> {
    return request<{ message: string; checkIn: CheckInItem; comprovante?: string }>('/checkins', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async syncOfflineCheckIns(items: Array<{
    id: string;
    type: 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT';
    timestamp: string;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    hash?: string;
  }>): Promise<{
    message: string;
    synced: Array<{
      id: string;
      status: string;
      checkinId: string;
      nsr: number;
      comprovante?: string;
    }>;
  }> {
    return request<{
      message: string;
      synced: Array<{
        id: string;
        status: string;
        checkinId: string;
        nsr: number;
        comprovante?: string;
      }>;
    }>('/checkins/sync-offline', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  async getMyCheckIns(page = 1, limit = 20): Promise<{ checkIns: CheckInItem[]; total: number }> {
    return request<{ checkIns: CheckInItem[]; total: number }>(`/checkins/me?page=${page}&limit=${limit}`);
  },

  async logout(): Promise<void> {
    await removeStoredToken();
  },

  // Totem Endpoints
  totem: {
    async activate(pin: string): Promise<{ totemToken: string; expiresIn: number }> {
      const data = await request<{ totemToken: string; expiresIn: number }>(
        '/totem/companies/me/totem/activate',
        {
          method: 'POST',
          body: JSON.stringify({ pin }),
        }
      );
      await setStoredTotemToken(data.totemToken, data.expiresIn);
      return data;
    },

    async deactivate(pin: string): Promise<{ message: string }> {
      const data = await request<{ message: string }>(
        '/totem/companies/me/totem/deactivate',
        {
          method: 'POST',
          body: JSON.stringify({ pin }),
        }
      );
      await removeStoredTotemToken();
      return data;
    },

    async recover(email: string, pass: string): Promise<{ message: string }> {
      const data = await request<{ message: string }>('/totem/recover', {
        method: 'POST',
        useTotemToken: true,
        body: JSON.stringify({ email, password: pass }),
      });
      await removeStoredTotemToken();
      return data;
    },

    async verify(emailOrCpf: string, pass: string): Promise<TotemVerifyResponse> {
      return request<TotemVerifyResponse>('/totem/verify', {
        method: 'POST',
        useTotemToken: true,
        body: JSON.stringify({ email: emailOrCpf.trim(), password: pass }),
      });
    },

    async checkin(data: TotemCheckinDto): Promise<TotemCheckinResponse> {
      return request<TotemCheckinResponse>('/totem/checkin', {
        method: 'POST',
        useTotemToken: true,
        body: JSON.stringify(data),
      });
    },

    async registerFace(userId: string, descriptor: number[]): Promise<{ message: string }> {
      return request<{ message: string }>('/totem/face/register', {
        method: 'POST',
        useTotemToken: true,
        body: JSON.stringify({ userId, descriptor }),
      });
    },

    async sendRecoveryCode(): Promise<{ message: string; emailMasked: string }> {
      return request<{ message: string; emailMasked: string }>('/totem/recover/code/send', {
        method: 'POST',
        useTotemToken: true,
      });
    },

    async verifyRecoveryCode(code: string): Promise<{ success: boolean; message: string }> {
      const data = await request<{ success: boolean; message: string }>('/totem/recover/code/verify', {
        method: 'POST',
        useTotemToken: true,
        body: JSON.stringify({ code }),
      });
      await removeStoredTotemToken();
      return data;
    },
  },

  espelhos: {
    async listarMeus(): Promise<MobileEspelhoItem[]> {
      return request<MobileEspelhoItem[]>('/espelhos/me');
    },

    async obterDetalhes(id: string): Promise<MobileEspelhoDetalhe> {
      return request<MobileEspelhoDetalhe>(`/espelhos/${id}`);
    },

    async assinar(id: string, password: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/espelhos/${id}/assinar`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    },

    async contestar(id: string, motivo: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/espelhos/${id}/contestar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
    },

    downloadPdfUrl(id: string): string {
      return `${API_URL}/espelhos/${id}/pdf`;
    },
  },

  justificativas: {
    async create(body: MobileJustificativaCreateDto): Promise<{ message: string; justificativa: MobileJustificativaItem }> {
      return request<{ message: string; justificativa: MobileJustificativaItem }>('/justificativas', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    async list(): Promise<MobileJustificativaItem[]> {
      return request<MobileJustificativaItem[]>('/justificativas');
    },

    getComprovanteUrl(id: string): string {
      return `${API_URL}/justificativas/${id}/comprovante`;
    },
  },

  workLocations: {
    async list(): Promise<MobileWorkLocationItem[]> {
      return request<MobileWorkLocationItem[]>('/work-locations');
    },
  },
};

export type MobileEspelhoStatus = 'LIBERADO' | 'ASSINADO' | 'CONTESTADO';

export interface MobileDiaEspelho {
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

export interface MobileResumoHorasEspelho {
  totalMinutosTrabalhados: number;
  totalMinutosExtras: number;
  totalDiasTrabalhados: number;
  horasTrabalhadasFormatadas: string;
  horasExtrasFormatadas: string;
}

export interface MobileEspelhoItem {
  id: string;
  ano: number;
  mes: number;
  status: MobileEspelhoStatus;
  resumoHoras: MobileResumoHorasEspelho;
  assinadoEm: string | null;
  motivoRecusa: string | null;
  createdAt: string;
}

export interface MobileEspelhoDetalhe {
  id: string;
  companyId: string;
  userId: string;
  ano: number;
  mes: number;
  status: MobileEspelhoStatus;
  hashDocumento: string;
  resumoHoras: MobileResumoHorasEspelho;
  detalhesDias: MobileDiaEspelho[];
  assinadoEm: string | null;
  motivoRecusa: string | null;
  createdAt: string;
}

export type MobileJustificativaTipo =
  | 'ESQUECIMENTO_PONTO'
  | 'ATESTADO_MEDICO'
  | 'DECLARACAO_COMPARECIMENTO'
  | 'ABONO_FALTA'
  | 'OUTRO';

export interface MobileJustificativaCreateDto {
  tipo: MobileJustificativaTipo;
  descricao: string;
  dataInicio: string;
  dataFim?: string;
  horarioAjustado?: string;
  tipoBatidaAjuste?: 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT';
  diasAfastamento?: number;
  arquivo?: {
    nomeOriginal: string;
    mimeType: string;
    conteudoBase64: string;
  };
}

export interface MobileJustificativaItem {
  id: string;
  userId: string;
  companyId: string;
  tipo: MobileJustificativaTipo;
  descricao: string;
  dataInicio: string;
  dataFim: string | null;
  horarioAjustado: string | null;
  tipoBatidaAjuste: 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT' | null;
  diasAfastamento: number | null;
  motivoRecusa: string | null;
  comprovanteNomeOriginal: string | null;
  comprovanteTamanho: number | null;
  aprovado: boolean | null;
  aprovadoPor: string | null;
  createdAt: string;
}

export interface MobileWorkLocationItem {
  id: string;
  nome: string;
  endereco: string | null;
  latitude: number;
  longitude: number;
  raioMetros: number;
  ativo: boolean;
}


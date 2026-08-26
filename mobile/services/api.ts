import * as SecureStore from 'expo-secure-store';

export const API_URL = 'https://viggoapi.fragata.me';

const TOKEN_KEY = '@viggo:token';
const USER_KEY = '@viggo:user';
const TOTEM_KEY = '@viggo:totem';
const TOTEM_EXP_KEY = '@viggo:totem:expiresAt';

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
}

export interface TotemVerifyResponse {
  faceToken: string;
  expiresIn: number;
  userId: string;
  userName: string;
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
  },
};

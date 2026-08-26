import * as SecureStore from 'expo-secure-store';

export const API_URL = 'https://viggoapi.fragata.me';

const TOKEN_KEY = '@viggo:token';
const USER_KEY = '@viggo:user';
const TOTEM_KEY = '@viggo:totem';

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
}

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

// Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || `Erro ${response.status}: Falha na requisição`;
    throw new Error(message);
  }

  return data as T;
}

// API Endpoints
export const api = {
  async login(emailOrCpf: string, password: string): Promise<{ token: string; user: UserSession }> {
    const isEmail = emailOrCpf.includes('@');
    const payload = isEmail
      ? { email: emailOrCpf, password }
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
  }): Promise<{ message: string; checkIn: CheckInItem }> {
    return request<{ message: string; checkIn: CheckInItem }>('/checkins', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getMyCheckIns(page = 1, limit = 20): Promise<{ checkIns: CheckInItem[]; total: number }> {
    return request<{ checkIns: CheckInItem[]; total: number }>(`/checkins/me?page=${page}&limit=${limit}`);
  },

  async logout(): Promise<void> {
    await removeStoredToken();
  }
};

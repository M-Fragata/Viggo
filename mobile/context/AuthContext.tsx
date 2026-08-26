import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, getStoredUser, getStoredToken, UserSession } from '../services/api';
import { router } from 'expo-router';

interface AuthContextData {
  user: UserSession | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (emailOrCpf: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStorage() {
      try {
        const token = await getStoredToken();
        const storedUser = await getStoredUser();

        if (token && storedUser) {
          setUser(storedUser);
          // Atualiza em background
          api.getMe().then(setUser).catch(() => {});
        }
      } catch (err) {
        console.error('Erro ao carregar sessão', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStorage();
  }, []);

  async function login(emailOrCpf: string, pass: string) {
    const data = await api.login(emailOrCpf, pass);
    setUser(data.user);
    router.replace('/(app)/punch');
  }

  async function logout() {
    await api.logout();
    setUser(null);
    router.replace('/(auth)/login');
  }

  const isAdmin = !!(user && (user.role === 'ADMIN' || user.role === 'ENTERPRISE_ADMIN' || user.role === 'MASTER'));

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

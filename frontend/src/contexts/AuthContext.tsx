import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, type User } from "../services/api";
import { jwtDecode } from "jwt-decode";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  setSession: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: () => void;
  isMaster: boolean;
  isEnterpriseAdmin: boolean;
  isEmployee: boolean;
  isAdminOrMaster: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function validateToken(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    const agora = Math.floor(Date.now() / 1000);
    return decoded.exp >= agora;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("@viggo:token");
    localStorage.removeItem("@viggo:user");
    setUser(null);
    setToken(null);
  }, []);

  const loadSession = useCallback(() => {
    const storedUser = localStorage.getItem("@viggo:user");
    const storedToken = localStorage.getItem("@viggo:token");

    if (storedUser && storedToken && validateToken(storedToken)) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {
        clearSession();
      }
    } else if (storedToken) {
      clearSession();
    }
    setIsLoading(false);
  }, [clearSession]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user, token } = await api.auth.login(email, password);
      localStorage.setItem("@viggo:user", JSON.stringify(user));
      localStorage.setItem("@viggo:token", token);
      setUser(user);
      setToken(token);
      return user;
    },
    []
  );

  const setSession = useCallback((newUser: User, newToken: string) => {
    localStorage.setItem("@viggo:user", JSON.stringify(newUser));
    localStorage.setItem("@viggo:token", newToken);
    setUser(newUser);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("@viggo:token");
    localStorage.removeItem("@viggo:user");
    setUser(null);
    setToken(null);
    window.location.href = "/";
  }, []);

  const refreshUser = useCallback(() => {
    loadSession();
  }, [loadSession]);''

  const isMaster = user?.role === "MASTER";
  const isEnterpriseAdmin = user?.role === "ENTERPRISE_ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";
  const isAdminOrMaster = isEnterpriseAdmin || isMaster;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        setSession,
        logout,
        refreshUser,
        isMaster,
        isEnterpriseAdmin,
        isEmployee,
        isAdminOrMaster,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
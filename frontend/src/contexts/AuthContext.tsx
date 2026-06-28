import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, type User } from "../services/api";
import { jwtDecode } from "jwt-decode";

interface AuthContextType {
  user: User | null;
  name: string | null;
  token: string | null;
  company: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  setSession: (user: User, token: string, company: string) => void;
  logout: () => void;
  refreshUser: () => void;
  isMaster: boolean;
  isEnterpriseAdmin: boolean;
  isEmployee: boolean;
  isAdminOrMaster: boolean;
  isImpersonated: boolean;
  impersonatedCompanyName: string | null;
  startImpersonation: (token: string, user: User, companyName: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface JWTPayload {
  exp: number;
  [key: string]: unknown;
}

function validateToken(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const agora = Math.floor(Date.now() / 1000);
    return decoded.exp >= agora;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [impersonatedCompanyName, setImpersonatedCompanyName] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem("@viggo:token");
    localStorage.removeItem("@viggo:user");
    localStorage.removeItem("@viggo:masterToken");
    localStorage.removeItem("@viggo:masterUser");
    localStorage.removeItem("@viggo:company")
    setUser(null);
    setName(null)
    setToken(null);
    setCompany(null)
    setIsImpersonated(false);
    setImpersonatedCompanyName(null);
  }, []);

  const loadSession = useCallback(() => {
    const storedUser = localStorage.getItem("@viggo:user");
    const storedToken = localStorage.getItem("@viggo:token");
    const storedCompany = localStorage.getItem("@viggo:company")
    const storedMasterToken = localStorage.getItem("@viggo:masterToken");
    const storedMasterUser = localStorage.getItem("@viggo:masterUser");

    if (storedUser && storedToken && validateToken(storedToken) && storedCompany) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setCompany(storedCompany)
        if (storedMasterToken && storedMasterUser) {
          setIsImpersonated(true);
          const masterUser = JSON.parse(storedMasterUser);
          setImpersonatedCompanyName(masterUser.companyName || null);
        }

        setName(() => {
          const firstName = JSON.parse(storedUser)?.name.split(" ")[0];
          const firstLetter = firstName?.slice(0, 1)
          const restName = firstName?.slice(1)
          return `${firstLetter?.toUpperCase()}${restName?.toLowerCase()}`
        })

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
      const { user, token, company } = await api.auth.login(email, password);
      localStorage.setItem("@viggo:user", JSON.stringify(user));
      localStorage.setItem("@viggo:token", token);
      localStorage.setItem("@viggo:company", company)
      setUser(user);
      setToken(token);
      setCompany(company);
      return user;
    },
    []
  );

  const setSession = useCallback((newUser: User, newToken: string, newCompany: string) => {
    localStorage.setItem("@viggo:user", JSON.stringify(newUser));
    localStorage.setItem("@viggo:token", newToken);
    localStorage.setItem("@viggo:token", newCompany);
    setUser(newUser);
    setToken(newToken);
    setCompany(newCompany)
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("@viggo:token");
    localStorage.removeItem("@viggo:user");
    localStorage.removeItem("@viggo:company");
    setUser(null);
    setToken(null);
    setCompany(null)
    window.location.href = "/";
  }, []);

  const refreshUser = useCallback(() => {
    loadSession();
  }, [loadSession]);

  const startImpersonation = useCallback((newToken: string, newUser: User, companyName: string) => {
    localStorage.setItem("@viggo:masterToken", token!);
    localStorage.setItem("@viggo:masterUser", JSON.stringify({ ...user, companyName }));
    localStorage.setItem("@viggo:token", newToken);
    localStorage.setItem("@viggo:user", JSON.stringify(newUser));
    setToken(newToken);
    setCompany(null)
    setUser(newUser);
    setIsImpersonated(true);
    setImpersonatedCompanyName(companyName);
  }, [token, user]);

  const stopImpersonation = useCallback(() => {
    const masterToken = localStorage.getItem("@viggo:masterToken");
    const masterUser = localStorage.getItem("@viggo:masterUser");
    if (masterToken && masterUser) {
      localStorage.setItem("@viggo:token", masterToken);
      localStorage.setItem("@viggo:user", masterUser);
      localStorage.removeItem("@viggo:masterToken");
      localStorage.removeItem("@viggo:masterUser");
      setToken(masterToken);
      setUser(JSON.parse(masterUser));
    }
    setCompany(company)
    setIsImpersonated(false);
    setImpersonatedCompanyName(null);
    window.location.href = "/master/companies";
  }, []);

  const isMaster = user?.role === "MASTER";
  const isEnterpriseAdmin = user?.role === "ENTERPRISE_ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";
  const isAdminOrMaster = isEnterpriseAdmin || isMaster;

  return (
    <AuthContext.Provider
      value={{
        user,
        name,
        token,
        company,
        isLoading,
        login,
        setSession,
        logout,
        refreshUser,
        isMaster,
        isEnterpriseAdmin,
        isEmployee,
        isAdminOrMaster,
        isImpersonated,
        impersonatedCompanyName,
        startImpersonation,
        stopImpersonation,
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
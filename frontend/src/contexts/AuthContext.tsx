import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, type User } from "../services/api";
import { decodeJWT, type JWTPayload } from "../utils/jwt";

interface AuthContextType {
  user: User | null;
  name: string | null;
  token: string | null;
  company: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  setSession: (user: User, token: string, company?: string) => void;
  logout: () => void;
  refreshUser: () => void;
  clearMustChangePassword: () => void;
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

function userFromJWT(decoded: JWTPayload): User {
  return {
    id: decoded.id,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
    companyId: decoded.companyId,
    createdAt: "",
    mustChangePassword: decoded.mustChangePassword,
  };
}

function formatName(rawName: string): string {
  const firstName = rawName.split(" ")[0];
  const firstLetter = firstName?.slice(0, 1);
  const restName = firstName?.slice(1);
  return `${firstLetter?.toUpperCase()}${restName?.toLowerCase()}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [impersonatedCompanyName, setImpersonatedCompanyName] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem("@viggo:token");
    localStorage.removeItem("@viggo:masterToken");
    setUser(null);
    setName(null);
    setToken(null);
    setCompany(null);
    setIsImpersonated(false);
    setImpersonatedCompanyName(null);
  }, []);

  const loadSession = useCallback(() => {
    const storedToken = localStorage.getItem("@viggo:token");
    const storedMasterToken = localStorage.getItem("@viggo:masterToken");

    if (storedToken) {
      const decoded = decodeJWT(storedToken);
      if (!decoded) {
        clearSession();
        setIsLoading(false);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp < now) {
        clearSession();
        setIsLoading(false);
        return;
      }

      try {
        const jwtUser = userFromJWT(decoded);
        setUser(jwtUser);
        setToken(storedToken);
        setCompany(decoded.companyName || null);
        setName(formatName(decoded.name));

        if (storedMasterToken) {
          const masterDecoded = decodeJWT(storedMasterToken);
          if (masterDecoded) {
            setIsImpersonated(true);
            setImpersonatedCompanyName(decoded.companyName || null);
          }
        }

        api.auth.me().then(({ user: freshUser }) => {
          setUser(prev => prev ? { ...prev, hasFaceDescriptor: freshUser.hasFaceDescriptor } : prev);
        }).catch(() => {});
      } catch {
        clearSession();
      }
    }
    setIsLoading(false);
  }, [clearSession]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user: apiUser, token: newToken, mustChangePassword } = await api.auth.login(email, password);
      localStorage.setItem("@viggo:token", newToken);

      const decoded = decodeJWT(newToken);
      const jwtUser = decoded ? userFromJWT(decoded) : apiUser;
      const finalUser = {
        ...jwtUser,
        hasFaceDescriptor: apiUser.hasFaceDescriptor,
        mustChangePassword: mustChangePassword ?? decoded?.mustChangePassword,
      };
      setUser(finalUser);
      setToken(newToken);
      setCompany(decoded?.companyName || null);
      setName(formatName(jwtUser.name));
      return finalUser;
    },
    []
  );

  const setSession = useCallback((newUser: User, newToken: string, _newCompany?: string) => {
    localStorage.setItem("@viggo:token", newToken);

    const decoded = decodeJWT(newToken);
    const jwtUser = decoded ? userFromJWT(decoded) : newUser;
    setUser({ ...jwtUser, hasFaceDescriptor: newUser.hasFaceDescriptor });
    setToken(newToken);
    setCompany(decoded?.companyName || null);
    setName(formatName(jwtUser.name));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("@viggo:token");
    setUser(null);
    setToken(null);
    setCompany(null);
    window.location.href = "/";
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: freshUser } = await api.auth.me();
      setUser(prev => prev ? { ...prev, hasFaceDescriptor: freshUser.hasFaceDescriptor } : prev);
    } catch {
      const storedToken = localStorage.getItem("@viggo:token");
      if (storedToken) {
        const decoded = decodeJWT(storedToken);
        if (decoded) setUser(userFromJWT(decoded));
      }
    }
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
  }, []);

  const startImpersonation = useCallback((newToken: string, _newUser: User, companyName: string) => {
    const currentToken = localStorage.getItem("@viggo:token");
    if (currentToken) {
      localStorage.setItem("@viggo:masterToken", currentToken);
    }

    localStorage.setItem("@viggo:token", newToken);

    const decoded = decodeJWT(newToken);
    const jwtUser = decoded ? userFromJWT(decoded) : _newUser;
    setUser(jwtUser);
    setToken(newToken);
    setCompany(decoded?.companyName || companyName);
    setName(formatName(jwtUser.name));
    setIsImpersonated(true);
    setImpersonatedCompanyName(companyName);
  }, []);

  const stopImpersonation = useCallback(() => {
    const masterToken = localStorage.getItem("@viggo:masterToken");
    if (masterToken) {
      const decoded = decodeJWT(masterToken);
      if (decoded) {
        localStorage.setItem("@viggo:token", masterToken);
        localStorage.removeItem("@viggo:masterToken");
        setUser(userFromJWT(decoded));
        setToken(masterToken);
        setCompany(decoded.companyName || null);
        setName(formatName(decoded.name));
        setIsImpersonated(false);
        setImpersonatedCompanyName(null);
        return;
      }
    }
    clearSession();
  }, [clearSession]);

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
        clearMustChangePassword,
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

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export const useAuth = useAuthContext;

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

function getInitialSession(): {
  user: User | null;
  company: string | null;
  name: string | null;
  token: string | null;
  isImpersonated: boolean;
  impersonatedCompanyName: string | null;
} {
  if (typeof window === "undefined") {
    return { user: null, company: null, name: null, token: null, isImpersonated: false, impersonatedCompanyName: null };
  }
  const storedToken = localStorage.getItem("@viggo:token");
  const storedMasterToken = localStorage.getItem("@viggo:masterToken");

  if (!storedToken) {
    return { user: null, company: null, name: null, token: null, isImpersonated: false, impersonatedCompanyName: null };
  }

  const decoded = decodeJWT(storedToken);
  if (!decoded || decoded.exp < Math.floor(Date.now() / 1000)) {
    localStorage.removeItem("@viggo:token");
    localStorage.removeItem("@viggo:masterToken");
    return { user: null, company: null, name: null, token: null, isImpersonated: false, impersonatedCompanyName: null };
  }

  const jwtUser = userFromJWT(decoded);
  let isImpersonated = false;
  let impersonatedCompanyName: string | null = null;

  if (storedMasterToken) {
    const masterDecoded = decodeJWT(storedMasterToken);
    if (masterDecoded) {
      isImpersonated = true;
      impersonatedCompanyName = decoded.companyName || null;
    }
  }

  return {
    user: jwtUser,
    company: decoded.companyName || null,
    name: formatName(decoded.name),
    token: storedToken,
    isImpersonated,
    impersonatedCompanyName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(getInitialSession);
  const [user, setUser] = useState<User | null>(initialSession.user);
  const [company, setCompany] = useState<string | null>(initialSession.company);
  const [name, setName] = useState<string | null>(initialSession.name);
  const [token, setToken] = useState<string | null>(initialSession.token);
  const [isLoading] = useState(false);
  const [isImpersonated, setIsImpersonated] = useState(initialSession.isImpersonated);
  const [impersonatedCompanyName, setImpersonatedCompanyName] = useState<string | null>(initialSession.impersonatedCompanyName);

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

  useEffect(() => {
    if (token) {
      api.auth.me().then(({ user: freshUser }) => {
        setUser(prev => prev ? { ...prev, hasFaceDescriptor: freshUser.hasFaceDescriptor } : prev);
      }).catch(() => {});
    }
  }, [token]);

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

  const setSession = useCallback((newUser: User, newToken: string, newCompany?: string) => {
    localStorage.setItem("@viggo:token", newToken);

    const decoded = decodeJWT(newToken);
    const jwtUser = decoded ? userFromJWT(decoded) : newUser;
    setUser({ ...jwtUser, hasFaceDescriptor: newUser.hasFaceDescriptor });
    setToken(newToken);
    setCompany(newCompany || decoded?.companyName || null);
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

import { useState, useEffect, useCallback } from "react";
import { api, type User, type CompanyStatus } from "../services/api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(() => {
    const stored = localStorage.getItem("@viggo:user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("@viggo:user");
        localStorage.removeItem("@viggo:token");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user, token } = await api.auth.login(email, password);
      localStorage.setItem("@viggo:user", JSON.stringify(user));
      localStorage.setItem("@viggo:token", JSON.stringify(token));
      setUser(user);
      return user;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("@viggo:token");
    localStorage.removeItem("@viggo:user");
    setUser(null);
    window.location.href = "/";
  }, []);

  const isMaster = user?.role === "MASTER";
  const isEnterpriseAdmin = user?.role === "ENTERPRISE_ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";
  const isAdminOrMaster = isEnterpriseAdmin || isMaster;

  return {
    user,
    isLoading,
    login,
    logout,
    isMaster,
    isEnterpriseAdmin,
    isEmployee,
    isAdminOrMaster,
    refreshUser: loadUser,
  };
}

export function useCompanyStatus() {
  const isTrialExpired = (planExpiresAt: string | null, status: CompanyStatus) => {
    if (status !== "TRIAL" || !planExpiresAt) return false;
    return new Date(planExpiresAt) < new Date();
  };

  const getTrialDaysRemaining = (planExpiresAt: string | null) => {
    if (!planExpiresAt) return 0;
    const diff = new Date(planExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const canAccess = (status: CompanyStatus, planExpiresAt: string | null) => {
    if (status === "SUSPENDED" || status === "CANCELLED") return false;
    if (isTrialExpired(planExpiresAt, status)) return false;
    return true;
  };

  return { isTrialExpired, getTrialDaysRemaining, canAccess };
}
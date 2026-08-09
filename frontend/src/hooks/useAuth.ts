export { useAuth } from "../contexts/AuthContext";

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

export type UserRole = "MASTER" | "ENTERPRISE_ADMIN" | "EMPLOYEE";
export type PlanTier = "DYNAMIC" | "ENTERPRISE_CUSTOM";
export type CompanyStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
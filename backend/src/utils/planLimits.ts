export enum PlanTier {
  DYNAMIC = 'DYNAMIC',
  ENTERPRISE_CUSTOM = 'ENTERPRISE_CUSTOM',
}

export enum CompanyStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  MASTER = 'MASTER',
  ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export interface PlanLimits {
  maxEmployees: number | null;
  price: number | null;
  api: {
    general: number;
    checkin: number;
    faceValidation: number;
  };
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.DYNAMIC]: {
    maxEmployees: null,
    price: 54.90,
    api: {
      general: 100,
      checkin: 10,
      faceValidation: 30,
    },
  },
  [PlanTier.ENTERPRISE_CUSTOM]: {
    maxEmployees: null,
    price: null,
    api: {
      general: 1000,
      checkin: 100,
      faceValidation: 200,
    },
  },
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS[PlanTier.DYNAMIC];
}

/**
 * No novo modelo dinâmico, sempre pode criar funcionário.
 * O preço ajusta automaticamente.
 */
export function canCreateEmployee(_plan: PlanTier, _currentCount: number): boolean {
  return true;
}

export function getEmployeeUsagePercentage(_plan: PlanTier, _currentCount: number): number {
  return 0;
}

export function isTrialExpired(planExpiresAt: Date | null): boolean {
  if (!planExpiresAt) return false;
  return new Date() > planExpiresAt;
}

export function getTrialDaysRemaining(planExpiresAt: Date | null): number {
  if (!planExpiresAt) return 0;
  const diff = planExpiresAt.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const TRIAL_DAYS = 30;
export const DEFAULT_PLAN = PlanTier.DYNAMIC;
export const DEFAULT_MAX_EMPLOYEES = 10;

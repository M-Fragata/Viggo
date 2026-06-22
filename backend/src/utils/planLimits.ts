export enum PlanTier {
  TIER_I = 'TIER_I',
  TIER_II = 'TIER_II',
  TIER_III = 'TIER_III',
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
  [PlanTier.TIER_I]: {
    maxEmployees: 10,
    price: 49.90,
    api: {
      general: 100,
      checkin: 10,
      faceValidation: 30,
    },
  },
  [PlanTier.TIER_II]: {
    maxEmployees: 50,
    price: 149.90,
    api: {
      general: 300,
      checkin: 20,
      faceValidation: 60,
    },
  },
  [PlanTier.TIER_III]: {
    maxEmployees: 150,
    price: 349.90,
    api: {
      general: 600,
      checkin: 50,
      faceValidation: 100,
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
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS[PlanTier.TIER_I];
}

export function canCreateEmployee(plan: PlanTier, currentCount: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.maxEmployees === null) return true;
  return currentCount < limits.maxEmployees;
}

export function getEmployeeUsagePercentage(plan: PlanTier, currentCount: number): number {
  const limits = getPlanLimits(plan);
  if (limits.maxEmployees === null) return 0;
  return Math.min(100, Math.round((currentCount / limits.maxEmployees) * 100));
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
export const DEFAULT_PLAN = PlanTier.TIER_I;
export const DEFAULT_MAX_EMPLOYEES = 10;
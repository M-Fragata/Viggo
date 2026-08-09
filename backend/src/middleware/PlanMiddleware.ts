import { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../database/prisma.js';
import { getPlanLimits, isTrialExpired } from '../utils/planLimits.js';
import { calculateDynamicPrice } from '../utils/pricingCalculator.js';
import { PlanTier, CompanyStatus } from '../utils/planLimits.js';

export interface PlanInfo {
  plan: PlanTier;
  status: CompanyStatus;
  maxEmployees: number;
  currentEmployees: number;
  planExpiresAt: Date | null;
  isTrial: boolean;
  trialDaysRemaining: number;
  willIncreasePrice: boolean;
  nextCyclePrice: number;
}

export async function getCompanyPlanInfo(companyId: string): Promise<PlanInfo | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      status: true,
      maxEmployees: true,
      planExpiresAt: true,
      trialUsed: true,
      _count: {
        select: { users: true },
      },
    },
  });

  if (!company) return null;

  const currentEmployees = company._count.users;
  const isTrial = company.status === CompanyStatus.TRIAL;
  const trialExpired = isTrialExpired(company.planExpiresAt);
  const pricing = calculateDynamicPrice(currentEmployees);

  return {
    plan: company.plan as PlanTier,
    status: company.status as CompanyStatus,
    maxEmployees: company.maxEmployees,
    currentEmployees,
    planExpiresAt: company.planExpiresAt,
    isTrial,
    trialDaysRemaining: trialExpired ? 0 : (isTrial ? Math.ceil((company.planExpiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0),
    willIncreasePrice: false,
    nextCyclePrice: pricing.total,
  };
}

export function requireActivePlan(req: Request, res: Response, next: NextFunction) {
  const planInfo = (req as any).planInfo as PlanInfo;

  if (!planInfo) {
    return res.status(403).json({ message: 'Empresa não encontrada' });
  }

  if (planInfo.status === CompanyStatus.SUSPENDED) {
    return res.status(403).json({
      message: 'Empresa suspensa. Entre em contato com o suporte.',
      code: 'COMPANY_SUSPENDED',
    });
  }

  if (planInfo.status === CompanyStatus.CANCELLED) {
    return res.status(403).json({
      message: 'Empresa cancelada. Entre em contato para reativação.',
      code: 'COMPANY_CANCELLED',
    });
  }

  if (planInfo.isTrial && planInfo.trialDaysRemaining <= 0) {
    return res.status(403).json({
      message: 'Período de trial expirado. Ative um plano para continuar.',
      code: 'TRIAL_EXPIRED',
      upgradeUrl: '/pricing',
    });
  }

  next();
}

export function requireEmployeeLimit(req: Request, res: Response, next: NextFunction) {
  const planInfo = (req as any).planInfo as PlanInfo;

  if (!planInfo) {
    return res.status(403).json({ message: 'Empresa não encontrada' });
  }

  // No plano dinâmico, sempre pode criar funcionários
  // O preço ajusta automaticamente no próximo ciclo
  if (planInfo.plan === PlanTier.DYNAMIC) {
    return next();
  }

  // Para Enterprise Custom, não há limite
  if (planInfo.plan === PlanTier.ENTERPRISE_CUSTOM) {
    return next();
  }

  next();
}

export async function planMiddleware(req: Request, res: Response, next: NextFunction) {
  const companyId = req.user?.companyId;

  if (!companyId) {
    return res.status(401).json({ message: 'Empresa não identificada no token' });
  }

  const planInfo = await getCompanyPlanInfo(companyId);

  if (!planInfo) {
    return res.status(403).json({ message: 'Empresa não encontrada' });
  }

  (req as any).planInfo = planInfo;
  next();
}

export function createDynamicRateLimiter(plan: PlanTier) {
  const limits = getPlanLimits(plan);

  return {
    general: limits.api.general,
    checkin: limits.api.checkin,
    faceValidation: limits.api.faceValidation,
  };
}

export { PlanTier, CompanyStatus };

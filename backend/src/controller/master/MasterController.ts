import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { z } from 'zod';
import { PlanTier, CompanyStatus } from '../../utils/planLimits.js';
import { calculateDynamicPrice } from '../../utils/pricingCalculator.js';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import jwt from 'jsonwebtoken';
import { Env } from '../../utils/environment.js';
import { createAuditLog } from '../../middleware/AuditMiddleware.js';

interface HealthScoreBreakdown {
  score: number;
  level: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  breakdown: {
    colaboradores: { score: number; max: number; passed: boolean; message: string };
    atividade: { score: number; max: number; passed: boolean; message: string };
    biometria: { score: number; max: number; passed: boolean; message: string };
    financeiro: { score: number; max: number; passed: boolean; message: string };
    gestao: { score: number; max: number; passed: boolean; message: string };
  };
}

function calculateHealthScore(company: {
  status: string;
  plan: string;
  createdAt: Date;
  users: { role: string; lastLoginAt: Date | null; faceDescriptor?: any }[];
  checkInsCountRecent3d: number;
  checkInsCountRecent7d: number;
  overduePaymentsCount: number;
}): HealthScoreBreakdown {
  const employeeCount = company.users.filter(u => u.role === 'EMPLOYEE').length;
  const colabPassed = employeeCount > 0;
  const colabScore = colabPassed ? 20 : 0;

  let atividadeScore = 0;
  let atividadeMsg = 'Sem registros de ponto nos últimos 7 dias';
  if (company.checkInsCountRecent3d > 0) {
    atividadeScore = 30;
    atividadeMsg = 'Registros de ponto ativos nos últimos 3 dias';
  } else if (company.checkInsCountRecent7d > 0) {
    atividadeScore = 15;
    atividadeMsg = 'Registros nos últimos 7 dias (sem atividade nos últimos 3d)';
  }

  const employeesWithFace = company.users.filter(u => u.role === 'EMPLOYEE' && u.faceDescriptor).length;
  const facePct = employeeCount > 0 ? (employeesWithFace / employeeCount) * 100 : 0;
  let biometriaScore = 0;
  let biometriaMsg = 'Nenhum funcionário com biometria facial';
  if (employeeCount === 0) {
    biometriaScore = 0;
    biometriaMsg = 'Sem funcionários cadastrados';
  } else if (facePct >= 50) {
    biometriaScore = 20;
    biometriaMsg = `${Math.round(facePct)}% dos colaboradores com biometria facial`;
  } else if (employeesWithFace > 0) {
    biometriaScore = 10;
    biometriaMsg = `${Math.round(facePct)}% dos colaboradores com biometria (< 50%)`;
  }

  let financeiroScore = 0;
  let financeiroMsg = 'Pagamento em atraso';
  if (company.overduePaymentsCount > 0) {
    financeiroScore = 0;
    financeiroMsg = `${company.overduePaymentsCount} pagamento(s) em atraso`;
  } else if (company.status === 'ACTIVE' || company.status === 'TRIAL') {
    financeiroScore = 20;
    financeiroMsg = company.status === 'TRIAL' ? 'Período de testes regular' : 'Assinatura ativa e em dia';
  } else {
    financeiroScore = 0;
    financeiroMsg = `Empresa ${company.status.toLowerCase()}`;
  }

  const now = Date.now();
  const admins = company.users.filter(u => u.role === 'ENTERPRISE_ADMIN');
  const mostRecentAdminLogin = admins.reduce<number | null>((latest, a) => {
    if (!a.lastLoginAt) return latest;
    const t = new Date(a.lastLoginAt).getTime();
    return latest === null || t > latest ? t : latest;
  }, null);

  let gestaoScore = 0;
  let gestaoMsg = 'Admin nunca realizou login';
  if (mostRecentAdminLogin) {
    const daysSinceLogin = Math.floor((now - mostRecentAdminLogin) / (1000 * 60 * 60 * 24));
    if (daysSinceLogin <= 7) {
      gestaoScore = 10;
      gestaoMsg = `Admin ativo (login há ${daysSinceLogin === 0 ? 'hoje' : daysSinceLogin + 'd'})`;
    } else if (daysSinceLogin <= 10) {
      gestaoScore = 5;
      gestaoMsg = `Admin acessou há ${daysSinceLogin}d (atenção: > 7d)`;
    } else {
      gestaoScore = 0;
      gestaoMsg = `Admin inativo há ${daysSinceLogin}d`;
    }
  }

  const totalScore = colabScore + atividadeScore + biometriaScore + financeiroScore + gestaoScore;
  const level = totalScore >= 80 ? 'HEALTHY' : totalScore >= 50 ? 'WARNING' : 'CRITICAL';

  return {
    score: totalScore,
    level,
    breakdown: {
      colaboradores: { score: colabScore, max: 20, passed: colabPassed, message: colabPassed ? `${employeeCount} funcionário(s) cadastrado(s)` : 'Sem funcionários além do admin' },
      atividade: { score: atividadeScore, max: 30, passed: atividadeScore > 0, message: atividadeMsg },
      biometria: { score: biometriaScore, max: 20, passed: biometriaScore >= 20, message: biometriaMsg },
      financeiro: { score: financeiroScore, max: 20, passed: financeiroScore === 20, message: financeiroMsg },
      gestao: { score: gestaoScore, max: 10, passed: gestaoScore >= 10, message: gestaoMsg },
    },
  };
}

export class MasterController {
  async listCompanies(req: Request, res: Response) {
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
      plan: z.enum(['DYNAMIC', 'ENTERPRISE_CUSTOM']).optional(),
      search: z.string().optional(),
    });
    try {
      const { page, limit, status, plan, search } = querySchema.parse(req.query);
      const where: any = {};
      if (status) where.status = status;
      if (plan) where.plan = plan;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search } },
        ];
      }
      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, name: true, cnpj: true, plan: true, status: true,
            planExpiresAt: true, maxEmployees: true, createdAt: true,
            _count: { select: { users: true, checkIns: true } },
            users: {
              select: { role: true, lastLoginAt: true, faceDescriptor: true },
            },
            payments: {
              where: { status: 'OVERDUE' },
              select: { id: true },
            },
          },
        }),
        prisma.company.count({ where }),
      ]);

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Calcular contagem de checkins recentes por empresa para calcular health score
      const companyIds = companies.map(c => c.id);
      const [checkins3d, checkins7d] = await Promise.all([
        prisma.checkIn.groupBy({
          by: ['companyId'],
          where: { companyId: { in: companyIds }, createdAt: { gte: threeDaysAgo } },
          _count: { _all: true },
        }),
        prisma.checkIn.groupBy({
          by: ['companyId'],
          where: { companyId: { in: companyIds }, createdAt: { gte: sevenDaysAgo } },
          _count: { _all: true },
        }),
      ]);

      const checkins3dMap = new Map(checkins3d.map(c => [c.companyId, c._count._all]));
      const checkins7dMap = new Map(checkins7d.map(c => [c.companyId, c._count._all]));

      return res.json({
        data: companies.map(company => {
          const pricing = calculateDynamicPrice(company._count.users);
          const c3d = checkins3dMap.get(company.id) || 0;
          const c7d = checkins7dMap.get(company.id) || 0;
          const health = calculateHealthScore({
            status: company.status,
            plan: company.plan,
            createdAt: company.createdAt,
            users: company.users,
            checkInsCountRecent3d: c3d,
            checkInsCountRecent7d: c7d,
            overduePaymentsCount: company.payments.length,
          });

          return {
            id: company.id,
            name: company.name,
            cnpj: company.cnpj,
            plan: company.plan,
            status: company.status,
            planExpiresAt: company.planExpiresAt,
            maxEmployees: company.maxEmployees,
            createdAt: company.createdAt,
            employeesCount: company._count.users,
            checkinsCount: company._count.checkIns,
            employeeUsagePercent: company.maxEmployees ? Math.round((company._count.users / company.maxEmployees) * 100) : 0,
            pricing: company.plan === 'DYNAMIC' ? pricing : null,
            healthScore: health.score,
            healthLevel: health.level,
          };
        }),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Parâmetros inválidos', errors: error.issues });
      }
      console.error('Erro ao listar empresas:', error);
      return res.status(500).json({ message: 'Erro ao listar empresas' });
    }
  }

  async getCompanyDetails(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });
    try {
      const { id } = paramsSchema.parse(req.params);
      const company = await prisma.company.findUnique({
        where: { id },
        select: {
          id: true, name: true, cnpj: true, plan: true, status: true,
          planExpiresAt: true, maxEmployees: true, settings: true,
          trialUsed: true, createdAt: true, updatedAt: true,
          _count: { select: { users: true, checkIns: true, subscriptions: true } },
          users: {
            select: { id: true, name: true, email: true, role: true, createdAt: true, lastLoginAt: true, faceDescriptor: true },
            orderBy: { createdAt: 'desc' },
          },
          subscriptions: { orderBy: { startedAt: 'desc' }, take: 10 },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
              id: true,
              amount: true,
              billingType: true,
              status: true,
              paymentUrl: true,
              invoiceUrl: true,
              dueDate: true,
              paidAt: true,
              createdAt: true,
              asaasPaymentId: true,
            },
          },
        },
      });
      if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [recentCheckins3d, recentCheckins7d, lastCheckin] = await Promise.all([
        prisma.checkIn.count({ where: { companyId: id, createdAt: { gte: threeDaysAgo } } }),
        prisma.checkIn.count({ where: { companyId: id, createdAt: { gte: sevenDaysAgo } } }),
        prisma.checkIn.findFirst({
          where: { companyId: id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      const overduePayments = company.payments.filter(p => p.status === 'OVERDUE');
      const healthScore = calculateHealthScore({
        status: company.status,
        plan: company.plan,
        createdAt: company.createdAt,
        users: company.users,
        checkInsCountRecent3d: recentCheckins3d,
        checkInsCountRecent7d: recentCheckins7d,
        overduePaymentsCount: overduePayments.length,
      });

      const pricing = calculateDynamicPrice(company._count.users);

      return res.json({
        ...company,
        employeesCount: company._count.users,
        checkinsCount: company._count.checkIns,
        subscriptionsCount: company._count.subscriptions,
        pricing: company.plan === 'DYNAMIC' ? pricing : null,
        healthScore,
        lastCheckinAt: lastCheckin?.createdAt || null,
        recentCheckins3d,
        recentCheckins7d,
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: 'Parâmetros inválidos', errors: error.issues });
      console.error('Erro ao buscar detalhes:', error);
      return res.status(500).json({ message: 'Erro ao buscar detalhes da empresa' });
    }
  }

  async getMetrics(req: Request, res: Response) {
    try {
      const querySchema = z.object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        granularity: z.enum(["day"]).optional().default("day"),
      });
      const { from: fromRaw, to: toRaw } = querySchema.parse((req.query as unknown) ?? {});
      const now = new Date();
      const from = fromRaw ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const to = toRaw ?? now;

      // Normalize to start/end of day for inclusive range
      const fromStart = new Date(from);
      fromStart.setHours(0, 0, 0, 0);
      const toEnd = new Date(to);
      toEnd.setHours(23, 59, 59, 999);

      const startOfThisMonth = startOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const endOfLastMonth = endOfMonth(subMonths(now, 1));

      // Timestamps para alertas de risco
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const [
        totalCompanies,
        activeCompanies,
        trialCompanies,
        suspendedCompanies,
        cancelledCompanies,
        planDistribution,
        totalUsers,
        checkinsThisMonth,
        checkinsLastMonth,
        activeSubscriptions,
        // Acquisition / conversion
        totalViews,
        uniquesResult,
        byDayRaw,
        bySourceRaw,
        companiesInRangeRaw,
        funnelVisit,
        funnelCta,
        funnelSignupView,
        // Companies for risk alerts
        riskCompanies,
      ] = await Promise.all([
        prisma.company.count(),
        prisma.company.count({ where: { status: CompanyStatus.ACTIVE } }),
        prisma.company.count({ where: { status: CompanyStatus.TRIAL } }),
        prisma.company.count({ where: { status: CompanyStatus.SUSPENDED } }),
        prisma.company.count({ where: { status: CompanyStatus.CANCELLED } }),
        prisma.company.groupBy({ by: ["plan"], _count: { plan: true } }),
        prisma.user.count(),
        prisma.checkIn.count({ where: { createdAt: { gte: startOfThisMonth } } }),
        prisma.checkIn.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
        prisma.subscription.findMany({
          where: { status: "ACTIVE" },
          select: { calculatedTotal: true, price: true, planTier: true, companyId: true },
        }),
        // Acquisition — total views in range
        prisma.pageView.count({ where: { createdAt: { gte: fromStart, lte: toEnd } } }).catch(() => 0),
        prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT "visitorId")::int as count FROM "PageView" WHERE "createdAt" >= ${fromStart} AND "createdAt" <= ${toEnd}`.catch(() => [{ count: BigInt(0) }]),
        prisma.$queryRaw<{ date: string; views: bigint; uniques: bigint }[]>`SELECT DATE("createdAt")::text as date, COUNT(*)::int as views, COUNT(DISTINCT "visitorId")::int as uniques FROM "PageView" WHERE "createdAt" >= ${fromStart} AND "createdAt" <= ${toEnd} GROUP BY DATE("createdAt") ORDER BY date`.catch(() => []),
        prisma.$queryRaw<{ source: string; views: bigint; uniques: bigint }[]>`SELECT COALESCE(NULLIF("utmSource", ''), '(direct)') as source, COUNT(*)::int as views, COUNT(DISTINCT "visitorId")::int as uniques FROM "PageView" WHERE "createdAt" >= ${fromStart} AND "createdAt" <= ${toEnd} GROUP BY source ORDER BY views DESC LIMIT 10`.catch(() => []),
        prisma.$queryRaw<{ date: string; count: bigint }[]>`SELECT DATE("createdAt")::text as date, COUNT(*)::int as count FROM "Company" WHERE "createdAt" >= ${fromStart} AND "createdAt" <= ${toEnd} GROUP BY DATE("createdAt") ORDER BY date`.catch(() => []),
        prisma.pageView.count({ where: { path: "/page", createdAt: { gte: fromStart, lte: toEnd } } }).catch(() => 0),
        prisma.analyticsEvent.count({ where: { name: "cta_click", createdAt: { gte: fromStart, lte: toEnd } } }).catch(() => 0),
        prisma.analyticsEvent.count({ where: { name: "signup_view", createdAt: { gte: fromStart, lte: toEnd } } }).catch(() => 0),
        // Buscar empresas ativas/trial/suspensas para calcular alertas de risco proativos
        prisma.company.findMany({
          where: {
            status: { in: [CompanyStatus.ACTIVE, CompanyStatus.TRIAL, CompanyStatus.SUSPENDED] },
          },
          select: {
            id: true,
            name: true,
            cnpj: true,
            status: true,
            plan: true,
            planExpiresAt: true,
            createdAt: true,
            users: {
              select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
            },
            payments: {
              where: { status: 'OVERDUE' },
              select: { id: true, amount: true, dueDate: true },
            },
            _count: {
              select: {
                checkIns: {
                  where: { createdAt: { gte: threeDaysAgo } },
                },
              },
            },
          },
        }),
      ]);

      const planDist = planDistribution.reduce((acc, p) => { acc[p.plan] = p._count.plan; return acc; }, {} as Record<string, number>);

      // MRR: soma dos calculatedTotal de assinaturas ativas — exclui master
      const masterCnpj = Env.MASTER_CNPJ?.replace(/\D/g, "");
      let filteredSubscriptions = activeSubscriptions as typeof activeSubscriptions;
      if (masterCnpj) {
        const masterCompanyIds = await prisma.company.findMany({
          where: { cnpj: masterCnpj },
          select: { id: true },
        }).then(rows => new Set(rows.map(r => r.id))).catch(() => new Set<string>());
        filteredSubscriptions = activeSubscriptions.filter(s => !masterCompanyIds.has(s.companyId));
      }
      const mrr = filteredSubscriptions.reduce((sum, sub) => {
        const value = sub.calculatedTotal ? Number(sub.calculatedTotal) : Number(sub.price ?? 0);
        return sum + value;
      }, 0);

      const churnRate = totalCompanies > 0 ? Math.round((cancelledCompanies / totalCompanies) * 100) : 0;
      const growthRate = checkinsLastMonth > 0 ? Math.round(((checkinsThisMonth - checkinsLastMonth) / checkinsLastMonth) * 100) : 0;

      // Acquisition aggregation
      const uniques = Number((uniquesResult as any)?.[0]?.count ?? 0);
      const byDay = (byDayRaw as any[]).map((r) => ({ date: r.date, views: Number(r.views), uniques: Number(r.uniques) }));
      const bySource = (bySourceRaw as any[]).map((r) => ({ utmSource: r.source, views: Number(r.views), uniques: Number(r.uniques) }));
      const companiesByDay = (companiesInRangeRaw as any[]).map((r) => ({ date: r.date, count: Number(r.count) }));
      const companiesInRange = companiesByDay.reduce((s, d) => s + d.count, 0);
      const conversionRate = uniques > 0 ? Number(((companiesInRange / uniques) * 100).toFixed(2)) : 0;
      const funnel = [
        { step: "visit", label: "Visita /page", count: funnelVisit },
        { step: "cta_click", label: "CTA click", count: funnelCta },
        { step: "signup_view", label: "View /company/signup", count: funnelSignupView },
        { step: "company_created", label: "Empresa criada", count: companiesInRange },
      ];

      // --- CÁLCULO DOS ALERTAS DE RISCO ---
      // 1. Onboarding travado: Criada há > 1 dia sem nenhum funcionário cadastrado (role == EMPLOYEE)
      const stalledOnboarding = riskCompanies
        .filter(c => c.createdAt <= oneDayAgo && c.users.filter(u => u.role === 'EMPLOYEE').length === 0)
        .map(c => {
          const admin = c.users.find(u => u.role === 'ENTERPRISE_ADMIN');
          return {
            id: c.id,
            name: c.name,
            cnpj: c.cnpj,
            createdAt: c.createdAt,
            adminName: admin?.name || null,
            adminEmail: admin?.email || null,
          };
        });

      // 2. Sem check-ins há 3 dias (para empresas com funcionários e ativas/trial)
      const noRecentCheckins = riskCompanies
        .filter(c => c.createdAt <= threeDaysAgo && c.status !== CompanyStatus.SUSPENDED && c._count.checkIns === 0 && c.users.filter(u => u.role === 'EMPLOYEE').length > 0)
        .map(c => {
          const admin = c.users.find(u => u.role === 'ENTERPRISE_ADMIN');
          return {
            id: c.id,
            name: c.name,
            cnpj: c.cnpj,
            status: c.status,
            employeesCount: c.users.filter(u => u.role === 'EMPLOYEE').length,
            adminName: admin?.name || null,
            adminEmail: admin?.email || null,
          };
        });

      // 3. Admin inativo: Empresa criada há > 10 dias onde os admins não logaram nos últimos 10 dias
      const inactiveAdmins = riskCompanies
        .filter(c => {
          if (c.createdAt > tenDaysAgo) return false;
          const admins = c.users.filter(u => u.role === 'ENTERPRISE_ADMIN');
          if (admins.length === 0) return true;
          return admins.every(a => !a.lastLoginAt || new Date(a.lastLoginAt) <= tenDaysAgo);
        })
        .map(c => {
          const admin = c.users.find(u => u.role === 'ENTERPRISE_ADMIN');
          const lastLogin = admin?.lastLoginAt ? new Date(admin.lastLoginAt) : null;
          const daysSinceLogin = lastLogin ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : null;
          return {
            id: c.id,
            name: c.name,
            cnpj: c.cnpj,
            adminName: admin?.name || null,
            adminEmail: admin?.email || null,
            lastLoginAt: admin?.lastLoginAt || null,
            daysSinceLogin,
          };
        });

      // 4. Trial expirando em ≤ 5 dias
      const expiringTrials = riskCompanies
        .filter(c => c.status === CompanyStatus.TRIAL && c.planExpiresAt && new Date(c.planExpiresAt) <= fiveDaysFromNow)
        .map(c => {
          const expiresAt = new Date(c.planExpiresAt!);
          const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          const admin = c.users.find(u => u.role === 'ENTERPRISE_ADMIN');
          return {
            id: c.id,
            name: c.name,
            cnpj: c.cnpj,
            planExpiresAt: c.planExpiresAt,
            daysRemaining,
            adminName: admin?.name || null,
            adminEmail: admin?.email || null,
          };
        });

      // 5. Inadimplência / Pagamento atrasado
      const overduePayments = riskCompanies
        .filter(c => c.payments.length > 0 || c.status === CompanyStatus.SUSPENDED)
        .map(c => {
          const admin = c.users.find(u => u.role === 'ENTERPRISE_ADMIN');
          const totalOverdue = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
          return {
            id: c.id,
            name: c.name,
            cnpj: c.cnpj,
            status: c.status,
            overdueCount: c.payments.length,
            totalOverdueAmount: totalOverdue,
            adminName: admin?.name || null,
            adminEmail: admin?.email || null,
          };
        });

      const totalRiskAlerts = stalledOnboarding.length + noRecentCheckins.length + inactiveAdmins.length + expiringTrials.length + overduePayments.length;

      // Cache 60s — dados diários
      res.setHeader("Cache-Control", "private, max-age=60");

      return res.json({
        companies: { total: totalCompanies, active: activeCompanies, trial: trialCompanies, suspended: suspendedCompanies, cancelled: cancelledCompanies },
        users: { total: totalUsers },
        checkins: { thisMonth: checkinsThisMonth, lastMonth: checkinsLastMonth, growthRate },
        revenue: { mrr, planDistribution: planDist },
        churn: { rate: churnRate, cancelled: cancelledCompanies },
        acquisition: { views: totalViews, uniques, byDay, bySource },
        conversion: { companiesCreated: companiesInRange, rate: conversionRate, byDay: companiesByDay },
        funnel,
        riskAlerts: {
          total: totalRiskAlerts,
          stalledOnboarding: { count: stalledOnboarding.length, list: stalledOnboarding },
          noRecentCheckins: { count: noRecentCheckins.length, list: noRecentCheckins },
          inactiveAdmins: { count: inactiveAdmins.length, list: inactiveAdmins },
          expiringTrials: { count: expiringTrials.length, list: expiringTrials },
          overduePayments: { count: overduePayments.length, list: overduePayments },
        },
        range: { from: fromStart.toISOString(), to: toEnd.toISOString() },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues });
      }
      console.error("Erro ao buscar métricas:", error);
      return res.status(500).json({ message: "Erro ao buscar métricas" });
    }
  }

  async listAuditLogs(req: Request, res: Response) {
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      action: z.string().optional(),
      entity: z.string().optional(),
      companyId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      search: z.string().optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    });

    try {
      const { page, limit, action, entity, companyId, userId, search, from, to } = querySchema.parse(req.query);
      const where: any = {};
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (companyId) where.companyId = companyId;
      if (userId) where.userId = userId;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = from;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          where.createdAt.lte = toEnd;
        }
      }
      if (search) {
        where.OR = [
          { action: { contains: search, mode: 'insensitive' } },
          { entity: { contains: search, mode: 'insensitive' } },
          { ip: { contains: search } },
          { purpose: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
      const companyIds = [...new Set(logs.map(l => l.companyId).filter(Boolean))];

      const [users, companies] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, role: true },
        }),
        prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true, cnpj: true },
        }),
      ]);

      const userMap = new Map(users.map(u => [u.id, u]));
      const companyMap = new Map(companies.map(c => [c.id, c]));

      const enrichedLogs = logs.map(log => ({
        ...log,
        user: userMap.get(log.userId) || null,
        company: companyMap.get(log.companyId) || null,
      }));

      return res.json({
        data: enrichedLogs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Parâmetros inválidos', errors: error.issues });
      }
      console.error('Erro ao listar audit logs:', error);
      return res.status(500).json({ message: 'Erro ao listar logs de auditoria' });
    }
  }

  async exportCompaniesCsv(req: Request, res: Response) {
    const querySchema = z.object({
      status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
      plan: z.enum(['DYNAMIC', 'ENTERPRISE_CUSTOM']).optional(),
      search: z.string().optional(),
    });

    try {
      const { status, plan, search } = querySchema.parse(req.query);
      const where: any = {};
      if (status) where.status = status;
      if (plan) where.plan = plan;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search } },
        ];
      }

      const companies = await prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          cnpj: true,
          plan: true,
          status: true,
          planExpiresAt: true,
          maxEmployees: true,
          createdAt: true,
          _count: { select: { users: true, checkIns: true } },
          users: { select: { role: true, lastLoginAt: true, faceDescriptor: true } },
          payments: { where: { status: 'OVERDUE' }, select: { id: true } },
        },
      });

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const companyIds = companies.map(c => c.id);
      const [checkins3d, checkins7d] = await Promise.all([
        prisma.checkIn.groupBy({
          by: ['companyId'],
          where: { companyId: { in: companyIds }, createdAt: { gte: threeDaysAgo } },
          _count: { _all: true },
        }),
        prisma.checkIn.groupBy({
          by: ['companyId'],
          where: { companyId: { in: companyIds }, createdAt: { gte: sevenDaysAgo } },
          _count: { _all: true },
        }),
      ]);

      const checkins3dMap = new Map(checkins3d.map(c => [c.companyId, c._count._all]));
      const checkins7dMap = new Map(checkins7d.map(c => [c.companyId, c._count._all]));

      const headers = [
        'ID',
        'Nome da Empresa',
        'CNPJ',
        'Status',
        'Plano',
        'Health Score',
        'Health Nível',
        'Colaboradores Cadastrados',
        'Total Check-ins',
        'Data Cadastro',
        'Expiração Trial / Plano',
        'MRR Estimado (R$)',
      ];

      const rows = companies.map(c => {
        const pricing = calculateDynamicPrice(c._count.users);
        const mrr = c.plan === 'DYNAMIC' ? pricing.total.toFixed(2) : 'Personalizado';
        const c3d = checkins3dMap.get(c.id) || 0;
        const c7d = checkins7dMap.get(c.id) || 0;
        const health = calculateHealthScore({
          status: c.status,
          plan: c.plan,
          createdAt: c.createdAt,
          users: c.users,
          checkInsCountRecent3d: c3d,
          checkInsCountRecent7d: c7d,
          overduePaymentsCount: c.payments.length,
        });

        return [
          c.id,
          `"${c.name.replace(/"/g, '""')}"`,
          `"${c.cnpj}"`,
          c.status,
          c.plan,
          health.score,
          health.level,
          c.maxEmployees ? `${c._count.users}/${c.maxEmployees}` : c._count.users,
          c._count.checkIns,
          c.createdAt.toISOString().slice(0, 10),
          c.planExpiresAt ? c.planExpiresAt.toISOString().slice(0, 10) : 'N/A',
          mrr,
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="empresas_viggo_${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csvContent);
    } catch (error) {
      console.error('Erro ao exportar empresas:', error);
      return res.status(500).json({ message: 'Erro ao exportar empresas' });
    }
  }

  async updateCompanyPlan(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });
    const bodySchema = z.object({ plan: z.enum(['DYNAMIC', 'ENTERPRISE_CUSTOM']), maxEmployees: z.number().min(1).optional() });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { plan, maxEmployees } = bodySchema.parse(req.body);
      const company = await prisma.company.findUnique({
        where: { id },
        select: { id: true, name: true, plan: true, maxEmployees: true, _count: { select: { users: true } } },
      });
      if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });

      let price = 0;
      let calculatedTotal = 0;
      let extraEmployees = 0;
      if (plan === 'DYNAMIC') {
        const pricing = calculateDynamicPrice(company._count.users);
        price = pricing.total;
        calculatedTotal = pricing.total;
        extraEmployees = pricing.extraEmployees;
      }

      const finalMaxEmployees = plan === 'DYNAMIC' ? null : (maxEmployees ?? company.maxEmployees);

      await prisma.subscription.updateMany({
        where: { companyId: id, status: 'ACTIVE' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      const updated = await prisma.company.update({
        where: { id },
        data: {
          plan: plan as any,
          maxEmployees: finalMaxEmployees as any,
          status: CompanyStatus.ACTIVE,
          planExpiresAt: null,
        },
      });

      await prisma.subscription.create({
        data: {
          companyId: id,
          planTier: plan as any,
          price,
          status: 'ACTIVE',
          billingType: 'MANUAL',
          basePrice: plan === 'DYNAMIC' ? 54.90 : 0,
          extraEmployees,
          extraPricePerUnit: plan === 'DYNAMIC' ? 5.00 : 0,
          calculatedTotal,
          startedAt: new Date(),
        },
      });

      return res.json({ id: updated.id, name: updated.name, plan: updated.plan, status: updated.status, maxEmployees: updated.maxEmployees });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      console.error('Erro ao atualizar plano:', error);
      return res.status(500).json({ message: 'Erro ao atualizar plano' });
    }
  }

  async updateCompanyStatus(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });
    const bodySchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']) });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { status } = bodySchema.parse(req.body);
      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });
      const updated = await prisma.company.update({ where: { id }, data: { status: status as any } });
      return res.json({ id: updated.id, name: updated.name, status: updated.status });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ message: 'Erro ao atualizar status' });
    }
  }

  async extendTrial(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });
    const bodySchema = z.object({ days: z.number().min(1).max(90).default(30) });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { days } = bodySchema.parse(req.body);
      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });
      const newExpiresAt = company.planExpiresAt ? new Date(company.planExpiresAt.getTime() + days * 24 * 60 * 60 * 1000) : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const updated = await prisma.company.update({ where: { id }, data: { planExpiresAt: newExpiresAt } });
      return res.json({ id: updated.id, name: updated.name, planExpiresAt: updated.planExpiresAt });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      console.error('Erro ao estender trial:', error);
      return res.status(500).json({ message: 'Erro ao estender trial' });
    }
  }

  async impersonate(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });
    try {
      const { id: companyId } = paramsSchema.parse(req.params);
      const masterUserId = req.user!.id;

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, plan: true, status: true },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      if (company.status === CompanyStatus.CANCELLED) {
        return res.status(400).json({ message: 'Não é possível impersonar uma empresa cancelada' });
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          companyId,
          role: { in: ['ENTERPRISE_ADMIN', 'EMPLOYEE'] },
        },
        orderBy: { role: 'desc' },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!targetUser) {
        return res.status(404).json({ message: 'Nenhum usuário encontrado na empresa' });
      }

      const token = jwt.sign(
        {
          id: masterUserId,
          role: 'ENTERPRISE_ADMIN',
          name: targetUser.name,
          email: targetUser.email,
          companyName: company.name,
          companyId: company.id,
          planTier: company.plan,
          isMaster: false,
          isImpersonated: true,
          impersonatedBy: masterUserId,
        },
        Env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      await createAuditLog({
        userId: masterUserId,
        companyId: company.id,
        action: 'IMPERSONATE',
        entity: 'User',
        entityId: targetUser.id,
        oldData: null,
        newData: {
          targetCompanyId: company.id,
          targetCompanyName: company.name,
          targetUserId: targetUser.id,
          targetUserRole: targetUser.role,
        },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
        legalBasis: 'Art. 7º, IX — Legítimo interesse',
        purpose: 'Acesso administrativo para suporte e manutenção',
        personalDataCategories: ['IDENTIFICACAO'],
      });

      return res.json({
        token,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: 'ENTERPRISE_ADMIN',
          companyId: company.id,
          companyName: company.name,
        },
        expiresIn: 3600,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Parâmetros inválidos', errors: error.issues });
      }
      console.error('Erro ao impersonar:', error);
      return res.status(500).json({ message: 'Erro ao impersonar' });
    }
  }
}


import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { z } from 'zod';
import { PlanTier, CompanyStatus } from '../../utils/planLimits.js';
import { calculateDynamicPrice } from '../../utils/pricingCalculator.js';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import jwt from 'jsonwebtoken';
import { Env } from '../../utils/environment.js';
import { createAuditLog } from '../../middleware/AuditMiddleware.js';

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
          },
        }),
        prisma.company.count({ where }),
      ]);
      return res.json({
        data: companies.map(company => {
          const pricing = calculateDynamicPrice(company._count.users);
          return {
            ...company,
            employeesCount: company._count.users,
            checkinsCount: company._count.checkIns,
            employeeUsagePercent: company.maxEmployees ? Math.round((company._count.users / company.maxEmployees) * 100) : 0,
            pricing: company.plan === 'DYNAMIC' ? pricing : null,
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
          users: { select: { id: true, name: true, email: true, role: true, createdAt: true, lastLoginAt: true }, orderBy: { createdAt: 'desc' } },
          subscriptions: { orderBy: { startedAt: 'desc' }, take: 10 },
        },
      });
      if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });
      const pricing = calculateDynamicPrice(company._count.users);
      return res.json({
        ...company,
        employeesCount: company._count.users,
        checkinsCount: company._count.checkIns,
        subscriptionsCount: company._count.subscriptions,
        pricing: company.plan === 'DYNAMIC' ? pricing : null,
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

      // Para plano DYNAMIC, calcular preço baseado em funcionários atuais
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

      // Cancelar assinatura anterior se existir
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

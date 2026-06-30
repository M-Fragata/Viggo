import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { z } from 'zod';
import { PlanTier, CompanyStatus, getPlanLimits } from '../../utils/planLimits.js';
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
      plan: z.enum(['TIER_I', 'TIER_II', 'TIER_III', 'ENTERPRISE_CUSTOM']).optional(),
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
        data: companies.map(company => ({
          ...company,
          employeesCount: company._count.users,
          checkinsCount: company._count.checkIns,
          employeeUsagePercent: company.maxEmployees ? Math.round((company._count.users / company.maxEmployees) * 100) : 0,
        })),
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
      return res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: 'Parâmetros inválidos', errors: error.issues });
      console.error('Erro ao buscar detalhes:', error);
      return res.status(500).json({ message: 'Erro ao buscar detalhes da empresa' });
    }
  }

  async getMetrics(req: Request, res: Response) {
    try {
      const now = new Date();
      const startOfThisMonth = startOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const endOfLastMonth = endOfMonth(subMonths(now, 1));
      const [totalCompanies, activeCompanies, trialCompanies, suspendedCompanies, cancelledCompanies, planDistribution, totalUsers, checkinsThisMonth, checkinsLastMonth] = await Promise.all([
        prisma.company.count(),
        prisma.company.count({ where: { status: CompanyStatus.ACTIVE } }),
        prisma.company.count({ where: { status: CompanyStatus.TRIAL } }),
        prisma.company.count({ where: { status: CompanyStatus.SUSPENDED } }),
        prisma.company.count({ where: { status: CompanyStatus.CANCELLED } }),
        prisma.company.groupBy({ by: ['plan'], _count: { plan: true } }),
        prisma.user.count(),
        prisma.checkIn.count({ where: { createdAt: { gte: startOfThisMonth } } }),
        prisma.checkIn.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      ]);
      const planDist = planDistribution.reduce((acc, p) => { acc[p.plan] = p._count.plan; return acc; }, {} as Record<string, number>);
      const mrr = Object.entries(planDist).reduce((sum, [plan, count]) => { const limits = getPlanLimits(plan as PlanTier); return sum + (limits.price ?? 0) * (count as number); }, 0);
      const churnRate = totalCompanies > 0 ? Math.round((cancelledCompanies / totalCompanies) * 100) : 0;
      const growthRate = checkinsLastMonth > 0 ? Math.round(((checkinsThisMonth - checkinsLastMonth) / checkinsLastMonth) * 100) : 0;
      return res.json({
        companies: { total: totalCompanies, active: activeCompanies, trial: trialCompanies, suspended: suspendedCompanies, cancelled: cancelledCompanies },
        users: { total: totalUsers },
        checkins: { thisMonth: checkinsThisMonth, lastMonth: checkinsLastMonth, growthRate },
        revenue: { mrr, planDistribution: planDist },
        churn: { rate: churnRate, cancelled: cancelledCompanies },
      });
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return res.status(500).json({ message: 'Erro ao buscar métricas' });
    }
  }

  async updateCompanyPlan(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });
    const bodySchema = z.object({ plan: z.enum(['TIER_I', 'TIER_II', 'TIER_III', 'ENTERPRISE_CUSTOM']), maxEmployees: z.number().min(1).optional() });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { plan, maxEmployees } = bodySchema.parse(req.body);
      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });
      const limits = getPlanLimits(plan as PlanTier);
      const finalMaxEmployees = maxEmployees ?? limits.maxEmployees ?? company.maxEmployees;
      const updated = await prisma.company.update({ where: { id }, data: { plan: plan as any, maxEmployees: finalMaxEmployees, status: CompanyStatus.ACTIVE, planExpiresAt: null } });
      await prisma.subscription.create({ data: { companyId: id, planTier: plan as any, price: limits.price ?? 0, status: 'ACTIVE', startedAt: new Date() } });
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

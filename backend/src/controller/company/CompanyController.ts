import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validateDocument } from '../../utils/cpfCnpjValidator.js';
import { getPlanLimits, TRIAL_DAYS, PlanTier, CompanyStatus } from '../../utils/planLimits.js';
import { addDays } from 'date-fns';

export class CompanyController {

  async signup(req: Request, res: Response) {
    const bodySchema = z.object({
      name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
      email: z.email('Email inválido'),
      cpf: z.string().min(11, 'CPF inválido'),
      cnpj: z.string().optional(),
      companyName: z.string().min(2, 'Nome da empresa inválido'),
      password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
      confirmPassword: z.string(),
    });

    try {
      const { name, email, cpf, cnpj, companyName, password, confirmPassword } = bodySchema.parse(req.body);

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Senhas não conferem' });
      }

      const cpfValidation = validateDocument(cpf);
      if (!cpfValidation.valid) {
        return res.status(400).json({ message: 'CPF inválido' });
      }

      if (cnpj) {
        const cnpjValidation = validateDocument(cnpj);
        if (!cnpjValidation.valid) {
          return res.status(400).json({ message: 'CNPJ inválido' });
        }
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      const existingCpf = await prisma.user.findUnique({ where: { cpf: cpfValidation.formatted } });
      if (existingCpf) {
        return res.status(400).json({ message: 'CPF já cadastrado' });
      }

      if (cnpj) {
        const cnpjValidation = validateDocument(cnpj);
        const existingCnpj = await prisma.company.findUnique({ where: { cnpj: cnpjValidation.formatted } });
        if (existingCnpj) {
          return res.status(400).json({ message: 'CNPJ já cadastrado' });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const trialExpiresAt = addDays(new Date(), TRIAL_DAYS);

      const company = await prisma.company.create({
        data: {
          name: companyName,
          cnpj: cnpj ? validateDocument(cnpj).formatted : null,
          plan: PlanTier.TIER_I,
          status: CompanyStatus.TRIAL,
          maxEmployees: 10,
          planExpiresAt: trialExpiresAt,
          trialUsed: true,
          settings: {},
        },
      });

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: passwordHash,
          cpf: cpfValidation.formatted,
          role: 'ENTERPRISE_ADMIN',
          companyId: company.id,
        },
      });

      await prisma.subscription.create({
        data: {
          companyId: company.id,
          planTier: PlanTier.TIER_I,
          price: 0,
          status: 'TRIAL',
          startedAt: new Date(),
          expiresAt: trialExpiresAt,
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          companyId: company.id,
          planTier: company.plan,
          isMaster: false
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        user: userWithoutPassword,
        company: {
          id: company.id,
          name: company.name,
          plan: company.plan,
          status: company.status,
          planExpiresAt: company.planExpiresAt,
          maxEmployees: company.maxEmployees,
        },
        token,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro no signup:', error);
      return res.status(500).json({ message: 'Erro ao criar empresa' });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          cnpj: true,
          plan: true,
          status: true,
          planExpiresAt: true,
          maxEmployees: true,
          settings: true,
          trialUsed: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      const limits = getPlanLimits(company.plan as PlanTier);
      const currentEmployees = company._count.users;

      return res.json({
        ...company,
        currentEmployees,
        employeeLimit: limits.maxEmployees,
        employeeUsagePercent: limits.maxEmployees ? Math.round((currentEmployees / limits.maxEmployees) * 100) : 0,
        canCreateEmployee: limits.maxEmployees === null || currentEmployees < limits.maxEmployees,
      });

    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      return res.status(500).json({ message: 'Erro ao buscar dados da empresa' });
    }
  }

  async updateMe(req: Request, res: Response) {
    const bodySchema = z.object({
      name: z.string().min(2).optional(),
      settings: z.object({
        logo: z.string().url().optional().nullable(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        timezone: z.string().optional(),
        checkinToleranceMinutes: z.number().min(0).max(60).optional(),
        lunchToleranceMinutes: z.number().min(0).max(120).optional(),
        requirePhoto: z.boolean().optional(),
        requireBiometry: z.boolean().optional(),
      }).optional(),
    });

    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const { name, settings } = bodySchema.parse(req.body);

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          ...(name && { name }),
          ...(settings && { settings: { ...(settings as object) } }),
        },
        select: {
          id: true,
          name: true,
          cnpj: true,
          plan: true,
          status: true,
          planExpiresAt: true,
          maxEmployees: true,
          settings: true,
        },
      });

      return res.json(company);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao atualizar empresa:', error);
      return res.status(500).json({ message: 'Erro ao atualizar empresa' });
    }
  }

  async getUsage(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          plan: true,
          maxEmployees: true,
          _count: { select: { users: true, checkIns: true } },
        },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      const limits = getPlanLimits(company.plan as PlanTier);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const checkinsThisMonth = await prisma.checkIn.count({
        where: {
          companyId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      return res.json({
        employees: {
          current: company._count.users,
          limit: limits.maxEmployees,
          percentage: limits.maxEmployees ? Math.round((company._count.users / limits.maxEmployees) * 100) : 0,
        },
        checkins: {
          thisMonth: checkinsThisMonth,
          total: company._count.checkIns,
        },
        apiLimits: limits.api,
        plan: company.plan,
      });

    } catch (error) {
      console.error('Erro ao buscar uso:', error);
      return res.status(500).json({ message: 'Erro ao buscar uso da empresa' });
    }
  }

  async createInvite(req: Request, res: Response) {
    const bodySchema = z.object({
      email: z.email('Email inválido'),
      role: z.enum(['ENTERPRISE_ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
      message: z.string().max(500).optional(),
    });

    try {
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!companyId || userRole !== 'ENTERPRISE_ADMIN') {
        return res.status(403).json({ message: 'Apenas admins da empresa podem convidar' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { plan: true, maxEmployees: true, _count: { select: { users: true } } },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      const limits = getPlanLimits(company.plan as PlanTier);
      if (limits.maxEmployees !== null && company._count.users >= limits.maxEmployees) {
        return res.status(403).json({
          message: 'Limite de funcionários atingido',
          code: 'EMPLOYEE_LIMIT_REACHED',
        });
      }

      const { email, role, message } = bodySchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Usuário já cadastrado' });
      }

      const existingInvite = await prisma.inviteToken.findFirst({
        where: { email, companyId, usedAt: null, expiresAt: { gt: new Date() } },
      });
      if (existingInvite) {
        return res.status(400).json({ message: 'Convite pendente para este email' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = addDays(new Date(), 7);

      const invite = await prisma.inviteToken.create({
        data: {
          email,
          companyId,
          role: role as any,
          token,
          expiresAt,
        },
      });

      const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite/${token}`;

      return res.status(201).json({
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          inviteUrl,
        },
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao criar convite:', error);
      return res.status(500).json({ message: 'Erro ao criar convite' });
    }
  }

  async listInvites(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const invites = await prisma.inviteToken.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          usedAt: true,
          createdAt: true,
        },
      });

      return res.json(invites);

    } catch (error) {
      console.error('Erro ao listar convites:', error);
      return res.status(500).json({ message: 'Erro ao listar convites' });
    }
  }

  async cancelInvite(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });

    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const { id } = paramsSchema.parse(req.params);

      const invite = await prisma.inviteToken.findFirst({
        where: { id, companyId },
      });

      if (!invite) {
        return res.status(404).json({ message: 'Convite não encontrado' });
      }

      if (invite.usedAt) {
        return res.status(400).json({ message: 'Convite já foi usado' });
      }

      await prisma.inviteToken.delete({ where: { id } });

      return res.json({ message: 'Convite cancelado' });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao cancelar convite:', error);
      return res.status(500).json({ message: 'Erro ao cancelar convite' });
    }
  }

  async acceptInvite(req: Request, res: Response) {
    const bodySchema = z.object({
      token: z.string(),
      name: z.string().min(3),
      password: z.string().min(8),
      confirmPassword: z.string(),
    });

    try {
      const { token, name, password, confirmPassword } = bodySchema.parse(req.body);

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Senhas não conferem' });
      }

      const invite = await prisma.inviteToken.findUnique({
        where: { token },
        include: { company: true },
      });

      if (!invite) {
        return res.status(404).json({ message: 'Convite inválido' });
      }

      if (invite.usedAt) {
        return res.status(400).json({ message: 'Convite já foi usado' });
      }

      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Convite expirado' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Usuário já cadastrado' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email: invite.email,
          password: passwordHash,
          role: invite.role,
          companyId: invite.companyId,
        },
      });

      await prisma.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      const { password: _, ...userWithoutPassword } = user;
      const authToken = jwt.sign(
        {
          id: user.id,
          role: user.role,
          companyId: invite.companyId,
          planTier: invite.company.plan,
          isMaster: false
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return res.json({
        user: userWithoutPassword,
        company: {
          id: invite.company.id,
          name: invite.company.name,
          plan: invite.company.plan,
        },
        token: authToken,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao aceitar convite:', error);
      return res.status(500).json({ message: 'Erro ao aceitar convite' });
    }
  }

  async getInviteByToken(req: Request, res: Response) {
    const paramsSchema = z.object({ token: z.string() });

    try {
      const { token } = paramsSchema.parse(req.params);

      const invite = await prisma.inviteToken.findUnique({
        where: { token },
        include: {
          company: {
            select: { id: true, name: true, plan: true, settings: true },
          },
        },
      });

      if (!invite) {
        return res.status(404).json({ message: 'Convite não encontrado' });
      }

      if (invite.usedAt) {
        return res.status(400).json({ message: 'Convite já foi usado' });
      }

      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Convite expirado' });
      }

      return res.json({
        email: invite.email,
        role: invite.role,
        company: invite.company,
        expiresAt: invite.expiresAt,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao buscar convite:', error);
      return res.status(500).json({ message: 'Erro ao buscar convite' });
    }
  }
  
}
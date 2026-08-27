import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validateDocument } from '../../utils/cpfCnpjValidator.js';
import { getPlanLimits, TRIAL_DAYS, PlanTier, CompanyStatus } from '../../utils/planLimits.js';
import { calculateDynamicPrice } from '../../utils/pricingCalculator.js';
import * as asaasService from '../../services/asaasService.js';
import { addDays } from 'date-fns';
import { FormattName } from "../../utils/formattName.js"

import { Env } from "../../utils/environment.js"
import { encryptCpf, decryptCpf, formatCpfDigits, hashCpf } from "../../utils/cpfEncryption.js"
import * as emailService from "../../services/email/emailService.js"

export class CompanyController {

  async signup(req: Request, res: Response) {
    const bodySchema = z.object({
      name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
      email: z.email('Email inválido'),
      cpf: z.string().min(11, 'CPF inválido'),
      cnpj: z.string().min(14, 'CNPJ é obrigatório para registro como REP-P'),
      companyName: z.string().min(2, 'Nome da empresa inválido'),
      password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
      confirmPassword: z.string(),
      aceiteContratos: z.boolean().refine((v) => v === true, {
        message: 'Você precisa aceitar os Termos, Política e DPA',
      }).optional(),
      aceiteTermos: z.boolean().optional(),
      aceiteDpa: z.boolean().optional(),
      aceiteBiometria: z.boolean().optional(),
    }).superRefine((data, ctx) => {
      const ok = data.aceiteContratos === true || (data.aceiteTermos === true && data.aceiteDpa === true);
      if (!ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Você precisa aceitar os Termos, Política e DPA', path: ['aceiteContratos'] });
      }
    });

    try {
      const { name, email, cpf, cnpj, companyName, password, confirmPassword, aceiteContratos, aceiteTermos, aceiteDpa } = bodySchema.parse(req.body);
      const aceiteContratosOk = aceiteContratos === true || (aceiteTermos === true && aceiteDpa === true);

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Senhas não conferem' });
      }

      const cpfValidation = validateDocument(cpf);
      if (!cpfValidation.valid) {
        return res.status(400).json({ message: 'CPF inválido' });
      }

      const cnpjValidation = validateDocument(cnpj);
      if (!cnpjValidation.valid) {
        return res.status(400).json({ message: 'CNPJ inválido' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      const encryptedCpf = encryptCpf(cpfValidation.formatted);
      const cpfHashValue = hashCpf(cpfValidation.formatted);
      const existingCpf = await prisma.user.findUnique({ where: { cpfHash: cpfHashValue } });
      if (existingCpf) {
        return res.status(400).json({ message: 'CPF já cadastrado' });
      }

      {
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
          cnpj: validateDocument(cnpj).formatted,
          plan: PlanTier.DYNAMIC,
          status: CompanyStatus.TRIAL,
          maxEmployees: 10,
          planExpiresAt: trialExpiresAt,
          trialUsed: true,
          settings: {},
        },
      });

      // Criar customer no Asaas (silencioso — não bloqueia signup)
      try {
        const customer = await asaasService.createCustomer({
          name: companyName,
          cpfCnpj: validateDocument(cnpj).formatted,
          email,
        });
        await prisma.company.update({
          where: { id: company.id },
          data: { asaasCustomerId: customer.id },
        });
      } catch (asaasError) {
        console.error('Erro ao criar customer no Asaas (signup continua):', asaasError);
      }

      const nameUser = FormattName(name)

      const user = await prisma.user.create({
        data: {
          name: nameUser,
          email,
          password: passwordHash,
          cpf: encryptedCpf,
          cpfHash: cpfHashValue,
          role: 'ENTERPRISE_ADMIN',
          companyId: company.id,
        },
      });

      await prisma.subscription.create({
        data: {
          companyId: company.id,
          planTier: PlanTier.DYNAMIC,
          price: 0,
          status: 'TRIAL',
          basePrice: 54.90,
          extraEmployees: 0,
          extraPricePerUnit: 5.00,
          calculatedTotal: 54.90,
          startedAt: new Date(),
          expiresAt: trialExpiresAt,
        },
      });

      // A-Opção A: 1 checkbox contratos → 3 consentimentos
      const ip = req.ip ?? req.socket.remoteAddress ?? null;
      const consentimentos = [
        { userId: user.id, tipo: "TERMOS_DE_USO", versao: "1.0", aceite: aceiteContratosOk, ip },
        { userId: user.id, tipo: "POLITICA_PRIVACIDADE", versao: "1.0", aceite: aceiteContratosOk, ip },
        { userId: user.id, tipo: "DPA", versao: "1.0", aceite: aceiteContratosOk, ip },
      ];

      await prisma.consentimento.createMany({ data: consentimentos });

      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          name: user.name,
          email: user.email,
          companyName: company.name,
          companyId: company.id,
          planTier: company.plan,
          isMaster: false
        },
        Env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // E-mail de boas-vindas (fire-and-forget)
      void emailService.sendWelcomeCompany({
        to: email,
        adminName: nameUser,
        companyName: company.name,
        trialExpiresAt,
      }).catch((err) => console.error("[Email] welcome-company failed:", err));

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
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
          totemActive: true,
          billingType: true,
          asaasPaymentMethod: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      const limits = getPlanLimits(company.plan as PlanTier);
      const currentEmployees = company._count.users;
      const pricing = calculateDynamicPrice(currentEmployees);

      return res.json({
        ...company,
        currentEmployees,
        employeeLimit: limits.maxEmployees,
        employeeUsagePercent: limits.maxEmployees ? Math.round((currentEmployees / limits.maxEmployees) * 100) : 0,
        canCreateEmployee: limits.maxEmployees === null || currentEmployees < limits.maxEmployees,
        pricing,
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
        ponto: z.object({
          facialMode: z.enum(['FRONTAL_ONLY', 'FULL_LIVENESS']).optional(),
          requirePhoto: z.boolean().optional(),
          requireBiometry: z.boolean().optional(),
          checkinToleranceMinutes: z.number().min(0).max(60).optional(),
          lunchToleranceMinutes: z.number().min(0).max(120).optional(),
        }).optional(),
        totem: z.object({
          authMode: z.enum(['CREDENTIALS_ONLY', 'FRONTAL_ONLY', 'FULL_LIVENESS']).optional(),
        }).optional(),
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

      let mergedSettings = undefined;
      if (settings) {
        const currentCompany = await prisma.company.findUnique({
          where: { id: companyId },
          select: { settings: true },
        });
        const currentSettings = (currentCompany?.settings as Record<string, any>) || {};
        mergedSettings = {
          ...currentSettings,
          ...settings,
          ponto: {
            ...(currentSettings.ponto || {}),
            ...(settings.ponto || {}),
          },
          totem: {
            ...(currentSettings.totem || {}),
            ...(settings.totem || {}),
          },
        };
      }

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          ...(name && { name }),
          ...(mergedSettings !== undefined && { settings: mergedSettings }),
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

      const employeesData = await prisma.user.findMany({
        where: { companyId }
      })

      const users = employeesData.map((employee) => {
        return {
          id: employee.id,
          name: employee.name,
          role: employee.role,
          email: employee.email,
          companyId: employee.companyId,
          createdAt: employee.createdAt
        }
      })

      return res.json({
        employees: {
          current: company._count.users,
          limit: limits.maxEmployees,
          percentage: limits.maxEmployees ? Math.round((company._count.users / limits.maxEmployees) * 100) : 0,
          users
        },
        checkins: {
          thisMonth: checkinsThisMonth,
          total: company._count.checkIns,
        },
        apiLimits: limits.api,
        plan: company.plan,
        pricing: calculateDynamicPrice(company._count.users),
      });

    } catch (error) {
      console.error('Erro ao buscar uso:', error);
      return res.status(500).json({ message: 'Erro ao buscar uso da empresa' });
    }
  }

  async createInviteToken(req: Request, res: Response) {
    const bodySchema = z.object({
      expiresInDays: z.number().int().min(1).max(365).optional().default(7),
      maxUses: z.number().int().min(1).optional().nullable(),
    });

    try {
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!companyId || userRole !== 'ENTERPRISE_ADMIN') {
        return res.status(403).json({ message: 'Apenas admins da empresa podem gerar tokens de convite' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { plan: true, maxEmployees: true, _count: { select: { users: true } } },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      // No plano dinâmico, sempre pode criar funcionários (preço ajusta automaticamente)
      const { expiresInDays, maxUses } = bodySchema.parse(req.body);

      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = addDays(new Date(), expiresInDays);

      const inviteToken = await prisma.inviteToken.create({
        data: {
          companyId,
          token,
          expiresAt,
          maxUses: maxUses ?? null,
        },
      });

      const inviteUrl = `${Env.FRONTEND_URL}/accept-invite/${token}`;
      const tokenMasked = `${token.slice(0, 8)}...`;

      return res.status(201).json({
        id: inviteToken.id,
        token,
        tokenMasked,
        inviteUrl,
        maxUses: inviteToken.maxUses,
        currentUses: inviteToken.currentUses,
        expiresAt: inviteToken.expiresAt,
        revokedAt: inviteToken.revokedAt,
        createdAt: inviteToken.createdAt,
        isActive: !inviteToken.revokedAt && inviteToken.expiresAt > new Date(),
        usedByUsers: [],
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao criar token de convite:', error);
      return res.status(500).json({ message: 'Erro ao criar token de convite' });
    }
  }

  async listInviteTokens(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const tokens = await prisma.inviteToken.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          usedByUsers: {
            include: {
              user: { select: { id: true, name: true, email: true, createdAt: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const now = new Date();
      const response = tokens.map((t) => ({
        id: t.id,
        token: t.token,
        tokenMasked: `${t.token.slice(0, 8)}...`,
        inviteUrl: `${Env.FRONTEND_URL}/accept-invite/${t.token}`,
        maxUses: t.maxUses,
        currentUses: t.currentUses,
        expiresAt: t.expiresAt,
        revokedAt: t.revokedAt,
        createdAt: t.createdAt,
        isActive: !t.revokedAt && t.expiresAt > now,
        usedByUsers: t.usedByUsers.map((u) => ({
          id: u.user.id,
          name: u.user.name,
          email: u.user.email,
          createdAt: u.createdAt,
        })),
      }));

      return res.json(response);
    } catch (error) {
      console.error('Erro ao listar tokens de convite:', error);
      return res.status(500).json({ message: 'Erro ao listar tokens de convite' });
    }
  }

  async revokeInviteToken(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.uuid() });

    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const { id } = paramsSchema.parse(req.params);

      const token = await prisma.inviteToken.findFirst({
        where: { id, companyId },
      });

      if (!token) {
        return res.status(404).json({ message: 'Token de convite não encontrado' });
      }

      if (token.revokedAt) {
        return res.status(400).json({ message: 'Token já foi revogado' });
      }

      await prisma.inviteToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      });

      return res.json({ message: 'Token de convite revogado' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao revogar token de convite:', error);
      return res.status(500).json({ message: 'Erro ao revogar token de convite' });
    }
  }

  async getInviteByToken(req: Request, res: Response) {
    const paramsSchema = z.object({ token: z.string() });

    try {
      const { token } = paramsSchema.parse(req.params);

      const inviteToken = await prisma.inviteToken.findUnique({
        where: { token },
        include: {
          company: {
            select: { id: true, name: true, plan: true, settings: true },
          },
        },
      });

      if (!inviteToken) {
        return res.status(404).json({ message: 'Token de convite não encontrado' });
      }

      const now = new Date();
      if (inviteToken.revokedAt) {
        return res.status(400).json({ message: 'Token de convite revogado' });
      }

      if (inviteToken.expiresAt < now) {
        return res.status(400).json({ message: 'Token de convite expirado' });
      }

      if (inviteToken.maxUses !== null && inviteToken.currentUses >= inviteToken.maxUses) {
        return res.status(400).json({ message: 'Token de convite atingiu o limite de usos' });
      }

      return res.json({
        company: inviteToken.company,
        expiresAt: inviteToken.expiresAt,
        maxUses: inviteToken.maxUses,
        currentUses: inviteToken.currentUses,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao buscar token de convite:', error);
      return res.status(500).json({ message: 'Erro ao buscar token de convite' });
    }
  }

  async acceptInvite(req: Request, res: Response) {
    const bodySchema = z.object({
      token: z.string(),
      email: z.email('Email inválido'),
      name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
      password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
      confirmPassword: z.string(),
      aceiteContratos: z.boolean().refine((v) => v === true, {
        message: 'Você precisa aceitar os Termos, Política e DPA',
      }).optional(),
      aceiteTermos: z.boolean().optional(),
      aceiteBiometria: z.boolean().refine((v) => v === true, {
        message: 'Você precisa autorizar o uso da biometria facial',
      }),
      aceiteDpa: z.boolean().optional(),
    }).superRefine((data, ctx) => {
      const contratosOk = data.aceiteContratos === true || (data.aceiteTermos === true && data.aceiteDpa === true);
      if (!contratosOk) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Você precisa aceitar os Termos, Política e DPA', path: ['aceiteContratos'] });
      }
    });

    try {
      const { token, email, name, password, confirmPassword, aceiteContratos, aceiteTermos, aceiteBiometria, aceiteDpa } = bodySchema.parse(req.body);
      const aceiteContratosOk = aceiteContratos === true || (aceiteTermos === true && aceiteDpa === true);

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Senhas não conferem' });
      }

      const inviteToken = await prisma.inviteToken.findUnique({
        where: { token },
        include: { company: true },
      });

      if (!inviteToken) {
        return res.status(404).json({ message: 'Token de convite não encontrado' });
      }

      const now = new Date();
      if (inviteToken.revokedAt) {
        return res.status(400).json({ message: 'Token de convite revogado' });
      }

      if (inviteToken.expiresAt < now) {
        return res.status(400).json({ message: 'Token de convite expirado' });
      }

      if (inviteToken.maxUses !== null && inviteToken.currentUses >= inviteToken.maxUses) {
        return res.status(400).json({ message: 'Token de convite atingiu o limite de usos' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const nameUser = FormattName(name)

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: nameUser,
            email,
            password: passwordHash,
            role: 'EMPLOYEE',
            companyId: inviteToken.companyId,
          },
        });

        // Opção A: 2 checkboxes — contratos (Termos+Política+DPA) + biometria
        const ip = req.ip ?? req.socket.remoteAddress ?? null;
        const consentimentos = [
          { userId: user.id, tipo: "TERMOS_DE_USO", versao: "1.0", aceite: aceiteContratosOk, ip },
          { userId: user.id, tipo: "POLITICA_PRIVACIDADE", versao: "1.0", aceite: aceiteContratosOk, ip },
          { userId: user.id, tipo: "BIOMETRIA", versao: "1.0", aceite: aceiteBiometria, ip },
          { userId: user.id, tipo: "DPA", versao: "1.0", aceite: aceiteContratosOk, ip },
        ];

        await tx.consentimento.createMany({ data: consentimentos });

        await tx.inviteTokenUsage.create({
          data: {
            inviteTokenId: inviteToken.id,
            userId: user.id,
          },
        });

        await tx.inviteToken.update({
          where: { id: inviteToken.id },
          data: { currentUses: { increment: 1 } },
        });

        return { user, inviteToken };
      });

      const { user, inviteToken: updatedToken } = result;

      // E-mail boas-vindas funcionário (fire-and-forget)
      void emailService.sendEmployeeWelcome({
        to: user.email,
        employeeName: user.name,
        companyName: inviteToken.company.name,
      }).catch((err) => console.error("[Email] employee-welcome failed:", err));

      const authToken = jwt.sign(
        {
          id: user.id,
          role: user.role,
          name: user.name,
          email: user.email,
          companyName: inviteToken.company.name,
          companyId: inviteToken.companyId,
          planTier: inviteToken.company.plan,
          isMaster: false,
        },
        Env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
        company: {
          id: inviteToken.company.id,
          name: inviteToken.company.name,
          plan: inviteToken.company.plan,
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
}
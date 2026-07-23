import type { Request, Response, NextFunction } from 'express';
import { extendedPrisma } from '../database/prisma-extensions.js';

interface AuditLogData {
  userId: string;
  companyId: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  legalBasis: string | null;
  purpose: string | null;
  personalDataCategories: string[] | null;
}

function toNullableString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toNullableStringRequired(value: string | string[] | undefined): string | null {
  const result = toNullableString(value);
  return result ?? null;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await extendedPrisma.auditLog.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldData: data.oldData as any,
        newData: data.newData as any,
        ip: data.ip,
        userAgent: data.userAgent,
        legalBasis: data.legalBasis,
        purpose: data.purpose,
        personalDataCategories: data.personalDataCategories as any,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CHECKIN: 'CHECKIN',
  FACE_VALIDATION: 'FACE_VALIDATION',
  FACE_REGISTER: 'FACE_REGISTER',
  FACE_TOKEN: 'FACE_TOKEN',
  IMPERSONATE: 'IMPERSONATE',
  EXPORT: 'EXPORT',
  APPROVE: 'APPROVE',
  CONSENT: 'CONSENT',
} as const;

const LGPD_MAPPINGS: Record<string, { legalBasis: string; purpose: string; personalDataCategories: string[] }> = {
  'LOGIN': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Autenticação e acesso ao sistema de registro de ponto',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'CHECKIN': {
    legalBasis: 'Art. 7º, V — Execução de contrato / Art. 7º, II — Obrigação legal (CLT Art. 74)',
    purpose: 'Registro de jornada de trabalho conforme obrigatoriedade legal',
    personalDataCategories: ['IDENTIFICACAO', 'GEOLOCALIZACAO', 'PONTO', 'BIOMETRIA'],
  },
  'FACE_VALIDATION': {
    legalBasis: 'Art. 11, II, f — Tutela da saúde / Art. 7º, V — Execução de contrato',
    purpose: 'Verificação de identidade do trabalhador no momento da marcação de ponto',
    personalDataCategories: ['IDENTIFICACAO', 'BIOMETRIA'],
  },
  'FACE_REGISTER': {
    legalBasis: 'Art. 11, I — Consentimento específico e destacado',
    purpose: 'Cadastro do vetor matemático facial para autenticação biométrica',
    personalDataCategories: ['IDENTIFICACAO', 'BIOMETRIA'],
  },
  'FACE_TOKEN': {
    legalBasis: 'Art. 11, I — Consentimento específico e destacado',
    purpose: 'Emissão de token descartável para validação facial',
    personalDataCategories: ['IDENTIFICACAO', 'BIOMETRIA'],
  },
  'CREATE': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Criação de recurso no sistema',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'UPDATE': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Atualização de dados cadastrais',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'DELETE': {
    legalBasis: 'Art. 7º, V — Execução de contrato / Art. 18, VI — Eliminação de dados',
    purpose: 'Remoção de dados do sistema',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'EXPORT': {
    legalBasis: 'Art. 7º, II — Obrigação legal (Portaria 671 Art. 78 §5º)',
    purpose: 'Geração de relatórios obrigatórios (AFD, Relatório Mensal MTE)',
    personalDataCategories: ['IDENTIFICACAO', 'PONTO'],
  },
  'APPROVE': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Análise e aprovação de justificativas de ausência',
    personalDataCategories: ['IDENTIFICACAO', 'PONTO'],
  },
  'CONSENT': {
    legalBasis: 'Art. 7º, I — Consentimento',
    purpose: 'Registro de consentimento do titular para tratamento de dados',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'IMPERSONATE': {
    legalBasis: 'Art. 7º, IX — Legítimo interesse',
    purpose: 'Acesso administrativo para suporte e manutenção',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'LOGOUT': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Encerramento de sessão',
    personalDataCategories: ['IDENTIFICACAO'],
  },
};

function getLgpdMapping(action: string): { legalBasis: string; purpose: string; personalDataCategories: string[] } | null {
  return LGPD_MAPPINGS[action] ?? null;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (req.user && (res.statusCode === 200 || res.statusCode === 201)) {
      const action = getActionFromRequest(req);
      if (action) {
        const lgpdMapping = getLgpdMapping(action);

        const auditData: AuditLogData = {
          userId: req.user.id,
          companyId: req.user.companyId || '',
          action,
          entity: getEntityFromRequest(req),
          entityId: (getEntityIdFromRequest(req, body) ?? null) as string | null,
          oldData: null,
          newData: null,
          ip: toNullableStringRequired(req.ip),
          userAgent: toNullableStringRequired(req.get('user-agent')),
          legalBasis: lgpdMapping?.legalBasis ?? null,
          purpose: lgpdMapping?.purpose ?? null,
          personalDataCategories: lgpdMapping?.personalDataCategories ?? null,
        };
        
        createAuditLog(auditData).catch(console.error);
      }
    }
    return originalJson(body);
  };

  next();
}

function getActionFromRequest(req: Request): string | null {
  const method = req.method;
  const path = req.path;

  if (method === 'POST' && path === '/sessions/login') return AUDIT_ACTIONS.LOGIN;
  if (method === 'POST' && path === '/checkins') return AUDIT_ACTIONS.CHECKIN;
  if (method === 'GET' && path === '/employees/face/token') return AUDIT_ACTIONS.FACE_TOKEN;
  if (method === 'POST' && path === '/employees/face/verify') return AUDIT_ACTIONS.FACE_VALIDATION;
  if (method === 'POST' && path === '/consentimentos') return AUDIT_ACTIONS.CONSENT;
  if (method === 'POST' && path === '/sessions') return AUDIT_ACTIONS.CREATE;
  if (method === 'PUT' && path.match(/^\/justificativas\/[^/]+\/aprovar$/)) return AUDIT_ACTIONS.APPROVE;
  if (method === 'GET' && path.includes('/export')) return AUDIT_ACTIONS.EXPORT;
  if (method === 'PUT') return AUDIT_ACTIONS.UPDATE;
  if (method === 'DELETE') return AUDIT_ACTIONS.DELETE;
  
  return null;
}

function getEntityFromRequest(req: Request): string {
  const path = req.path;
  
  if (path.startsWith('/checkins')) return 'CheckIn';
  if (path.startsWith('/employees')) return 'User';
  if (path.startsWith('/sessions')) return 'Session';
  if (path.startsWith('/companies')) return 'Company';
  if (path.startsWith('/consentimentos')) return 'Consentimento';
  if (path.startsWith('/justificativas')) return 'Justificativa';
  if (path.startsWith('/privacy')) return 'Privacy';
  
  return 'Unknown';
}

function getEntityIdFromRequest(req: Request, body: any): string | null {
  const id = req.params.id ?? body?.id ?? req.user?.id;
  return id ?? null;
}

export { AUDIT_ACTIONS };

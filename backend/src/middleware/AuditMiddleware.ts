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
  INVITE: 'INVITE',
  ACCEPT_INVITE: 'ACCEPT_INVITE',
} as const;

const LGPD_MAPPINGS: Record<string, { legalBasis: string; purpose: string; personalDataCategories: string[] }> = {
  'LOGIN': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Autenticação e acesso ao sistema de registro de ponto',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'LOGOUT': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Encerramento de sessão',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'CHECKIN': {
    legalBasis: 'Art. 7º, V — Execução de contrato / Art. 7º, II — Obrigação legal (CLT Art. 74)',
    purpose: 'Registro de jornada de trabalho conforme obrigatoriedade legal',
    personalDataCategories: ['IDENTIFICACAO', 'GEOLOCALIZACAO', 'PONTO', 'BIOMETRIA'],
  },
  'FACE_VALIDATION': {
    legalBasis: 'Art. 11, I — Consentimento específico e destacado + Art. 11, II, g — Prevenção à fraude e garantia da segurança do titular',
    purpose: 'Verificação de identidade do trabalhador no momento da marcação de ponto para prevenção de fraude (ponto por terceiro)',
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
    legalBasis: 'Art. 7º, II — Obrigação legal (Portaria 671 Art. 78 §5º) / Art. 18, V — Portabilidade',
    purpose: 'Geração de relatórios e exportação de dados do titular',
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
  'INVITE': {
    legalBasis: 'Art. 7º, V — Execução de contrato',
    purpose: 'Convite enviado para novo funcionário integrar a empresa',
    personalDataCategories: ['IDENTIFICACAO'],
  },
  'ACCEPT_INVITE': {
    legalBasis: 'Art. 7º, V — Execução de contrato / Art. 11, I — Consentimento',
    purpose: 'Aceite de convite e registro de consentimentos LGPD pelo novo funcionário',
    personalDataCategories: ['IDENTIFICACAO', 'BIOMETRIA'],
  },
  'IMPERSONATE': {
    legalBasis: 'Art. 7º, IX — Legítimo interesse',
    purpose: 'Acesso administrativo para suporte e manutenção',
    personalDataCategories: ['IDENTIFICACAO'],
  },
};

// Mapping of route path prefix -> { entity name, prisma delegate }
// We use the prisma client to fetch oldData before UPDATE/DELETE
const ENTITY_DELEGATES: Record<string, { entity: string; idParam: string; delegate: keyof typeof extendedPrisma; sensitiveFields: string[] }> = {
  '/sessions': { entity: 'Session', idParam: 'userId', delegate: 'user', sensitiveFields: ['cpf', 'faceDescriptor', 'password'] },
  '/employees': { entity: 'User', idParam: 'id', delegate: 'user', sensitiveFields: ['cpf', 'faceDescriptor', 'password'] },
  '/companies': { entity: 'Company', idParam: 'id', delegate: 'company', sensitiveFields: [] },
  '/consentimentos': { entity: 'Consentimento', idParam: 'id', delegate: 'consentimento', sensitiveFields: ['ip'] },
  '/justificativas': { entity: 'Justificativa', idParam: 'id', delegate: 'justificativa', sensitiveFields: [] },
  '/work-schedules': { entity: 'WorkSchedule', idParam: 'id', delegate: 'workSchedule', sensitiveFields: [] },
  '/privacy': { entity: 'Privacy', idParam: '', delegate: 'user', sensitiveFields: ['cpf', 'faceDescriptor', 'password'] },
  '/checkins': { entity: 'CheckIn', idParam: 'id', delegate: 'checkIn', sensitiveFields: [] },
};

function getLgpdMapping(action: string): { legalBasis: string; purpose: string; personalDataCategories: string[] } | null {
  return LGPD_MAPPINGS[action] ?? null;
}

function redactSensitive(data: Record<string, unknown> | null, sensitiveFields: string[]): Record<string, unknown> | null {
  if (!data) return null;
  const redacted = { ...data };
  for (const field of sensitiveFields) {
    if (field in redacted && redacted[field] !== null && redacted[field] !== undefined) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
}

function getActionFromRequest(req: Request): string | null {
  const method = req.method;
  const path = req.path;

  if (method === 'POST' && path === '/sessions/login') return AUDIT_ACTIONS.LOGIN;
  if (method === 'POST' && path === '/checkins') return AUDIT_ACTIONS.CHECKIN;
  if (method === 'GET' && path === '/employees/face/token') return AUDIT_ACTIONS.FACE_TOKEN;
  if (method === 'POST' && path === '/employees/face/verify') return AUDIT_ACTIONS.FACE_VALIDATION;
  if (method === 'PUT' && path.match(/^\/employees\/[^/]+\/face$/)) return AUDIT_ACTIONS.FACE_REGISTER;
  if (method === 'POST' && path === '/consentimentos') return AUDIT_ACTIONS.CONSENT;
  if (method === 'POST' && path === '/companies/invite') return AUDIT_ACTIONS.INVITE;
  if (method === 'POST' && path === '/companies/accept-invite') return AUDIT_ACTIONS.ACCEPT_INVITE;
  if (method === 'PUT' && path.match(/^\/justificativas\/[^/]+\/aprovar$/)) return AUDIT_ACTIONS.APPROVE;
  if (method === 'GET' && path.includes('/export')) return AUDIT_ACTIONS.EXPORT;
  if (method === 'POST') return AUDIT_ACTIONS.CREATE;
  if (method === 'PUT') return AUDIT_ACTIONS.UPDATE;
  if (method === 'DELETE') return AUDIT_ACTIONS.DELETE;

  return null;
}

function getEntityConfig(req: Request): { entity: string; idParam: string; delegate: keyof typeof extendedPrisma; sensitiveFields: string[] } | null {
  const path = req.path;
  for (const prefix of Object.keys(ENTITY_DELEGATES)) {
    if (path.startsWith(prefix)) {
      return ENTITY_DELEGATES[prefix] ?? null;
    }
  }
  return null;
}

function getEntityFromRequest(req: Request): string {
  return getEntityConfig(req)?.entity ?? 'Unknown';
}

function getEntityIdFromRequest(req: Request, body: any): string | null {
  const config = getEntityConfig(req);
  const idFromParam = config?.idParam ? (req.params as any)[config.idParam] : null;
  const id = idFromParam ?? req.params.id ?? body?.id ?? req.user?.id;
  return id ?? null;
}

// Async function to fetch old data for UPDATE/DELETE operations
async function fetchOldData(req: Request): Promise<Record<string, unknown> | null> {
  const config = getEntityConfig(req);
  if (!config) return null;

  const entityId = config.idParam ? (req.params as any)[config.idParam] : null;
  if (!entityId) return null;

  try {
    const delegate = extendedPrisma[config.delegate] as any;
    const record = await delegate.findUnique({
      where: { id: entityId },
    });
    return redactSensitive(record, config.sensitiveFields);
  } catch {
    // If fetch fails (e.g., entity doesn't have a findUnique or wrong ID), skip oldData
    return null;
  }
}

/**
 * Global async audit middleware. Captures oldData (UPDATE/DELETE) before the handler runs,
 * and newData (UPDATE response body) after. Writes the audit log on successful responses.
 * 
 * Note: req.user is typically populated by authMiddleware (mounted per-route, after this
 * global middleware). We therefore only check the HTTP action at mount time, and defer the
 * req.user check to the res.json override (which runs after the handler completes).
 */
export async function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const action = getActionFromRequest(req);
  if (!action) {
    return next();
  }

  // M1: oldData eager só quando req.user já existe; caso contrário lazy dentro do override
  const eagerOldData = (req.method === 'PUT' || req.method === 'DELETE') && req.user
    ? await fetchOldData(req)
    : null;

  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (req.user && (res.statusCode === 200 || res.statusCode === 201)) {
      const lgpdMapping = getLgpdMapping(action);
      const config = getEntityConfig(req);
      const entityId = getEntityIdFromRequest(req, body) ?? null;

      // M1: lazy fetch quando req.user só apareceu após authMiddleware per-route
      const doAudit = async () => {
        let oldData: Record<string, unknown> | null = eagerOldData;
        if (!oldData && (req.method === 'PUT' || req.method === 'DELETE')) {
          oldData = await fetchOldData(req);
        }

        // M1: newData também em POST (create) além de PUT, com redactSensitive
        let newData: Record<string, unknown> | null = null;
        if ((req.method === 'PUT' || req.method === 'POST') && body && typeof body === 'object') {
          const candidate = body.user ?? body.data ?? body;
          if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
            newData = redactSensitive(candidate as Record<string, unknown>, config?.sensitiveFields ?? []);
          } else if (Array.isArray(body) && body.length > 0) {
            // createMany retorna array — pega primeiro para trilha
            const first = body[0] as Record<string, unknown>;
            newData = redactSensitive(first, config?.sensitiveFields ?? []);
          }
        }

        const auditData: AuditLogData = {
          userId: req.user.id,
          companyId: req.user.companyId || '',
          action,
          entity: getEntityFromRequest(req),
          entityId,
          oldData,
          newData,
          ip: toNullableStringRequired(req.ip),
          userAgent: toNullableStringRequired(req.get('user-agent')),
          legalBasis: lgpdMapping?.legalBasis ?? null,
          purpose: lgpdMapping?.purpose ?? null,
          personalDataCategories: lgpdMapping?.personalDataCategories ?? null,
        };

        createAuditLog(auditData).catch(console.error);
      };
      doAudit().catch(console.error);
    }
    return originalJson(body);
  };

  next();
}

export { AUDIT_ACTIONS };

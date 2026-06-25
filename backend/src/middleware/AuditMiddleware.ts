import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/prisma.js';

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
    await prisma.auditLog.create({
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
  IMPERSONATE: 'IMPERSONATE',
} as const;

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (req.user && (res.statusCode === 200 || res.statusCode === 201)) {
      const action = getActionFromRequest(req);
      if (action) {
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
  if (method === 'GET' && path === '/employees/face') return AUDIT_ACTIONS.FACE_VALIDATION;
  if (method === 'PUT' && path.match(/^\/sessions\/[^/]+$/)) return AUDIT_ACTIONS.FACE_REGISTER;
  if (method === 'POST' && path === '/sessions') return AUDIT_ACTIONS.CREATE;
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
  
  return 'Unknown';
}

function getEntityIdFromRequest(req: Request, body: any): string | null {
  const id = req.params.id ?? body?.id ?? req.user?.id;
  return id ?? null;
}

export { AUDIT_ACTIONS };
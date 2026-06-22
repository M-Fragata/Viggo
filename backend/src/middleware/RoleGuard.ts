import { type Request, type Response, type NextFunction } from 'express';
import { UserRole } from '../utils/planLimits.js';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;
    
    if (!userRole) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Acesso negado. Permissão insuficiente.',
        requiredRoles: allowedRoles,
        currentRole: userRole,
      });
    }

    next();
  };
}

export const requireMaster = requireRole(UserRole.MASTER);
export const requireEnterpriseAdmin = requireRole(UserRole.ENTERPRISE_ADMIN, UserRole.MASTER);
export const requireAdminOrMaster = requireRole(UserRole.ENTERPRISE_ADMIN, UserRole.MASTER);
export const requireEmployeeOrAbove = requireRole(UserRole.EMPLOYEE, UserRole.ENTERPRISE_ADMIN, UserRole.MASTER);

export function isMaster(req: Request): boolean {
  return req.user?.role === UserRole.MASTER;
}

export function isEnterpriseAdmin(req: Request): boolean {
  return req.user?.role === UserRole.ENTERPRISE_ADMIN;
}

export function isEmployee(req: Request): boolean {
  return req.user?.role === UserRole.EMPLOYEE;
}

export function canManageCompany(req: Request, targetCompanyId: string): boolean {
  const userRole = req.user?.role as UserRole;
  const userCompanyId = req.user?.companyId;
  
  if (userRole === UserRole.MASTER) return true;
  if (userRole === UserRole.ENTERPRISE_ADMIN && userCompanyId === targetCompanyId) return true;
  
  return false;
}

export function canAccessMasterRoutes(req: Request): boolean {
  return req.user?.role === UserRole.MASTER;
}

export { UserRole };
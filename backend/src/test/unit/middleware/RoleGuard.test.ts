import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "../../../utils/planLimits.js";

import {
  requireRole,
  requireMaster,
  requireEnterpriseAdmin,
  requireAdminOrMaster,
  requireEmployeeOrAbove,
  isMaster,
  isEnterpriseAdmin,
  isEmployee,
  canManageCompany,
  canAccessMasterRoutes,
} from "../../../middleware/RoleGuard.js";

describe("RoleGuard", () => {
  const mockReq = (role?: string, companyId?: string) => ({
    user: role ? { role, companyId: companyId ?? "company-1" } : undefined,
  });

  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireRole", () => {
    it("deve permitir角色 na lista de permitidas", () => {
      const middleware = requireRole(UserRole.MASTER, UserRole.ENTERPRISE_ADMIN);
      const req = mockReq("MASTER");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("deve bloquear角色 não na lista", () => {
      const middleware = requireRole(UserRole.MASTER);
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Acesso negado"),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve retornar 401 quando req.user não existe", () => {
      const middleware = requireRole(UserRole.MASTER);
      const req = mockReq();
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve incluir requiredRoles e currentRole no erro 403", () => {
      const middleware = requireRole(UserRole.MASTER, UserRole.ENTERPRISE_ADMIN);
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredRoles: [UserRole.MASTER, UserRole.ENTERPRISE_ADMIN],
          currentRole: "EMPLOYEE",
        })
      );
    });
  });

  describe("requireMaster", () => {
    it("deve permitir MASTER", () => {
      const req = mockReq("MASTER");
      const res = mockRes();

      requireMaster(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear ENTERPRISE_ADMIN", () => {
      const req = mockReq("ENTERPRISE_ADMIN");
      const res = mockRes();

      requireMaster(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve bloquear EMPLOYEE", () => {
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      requireMaster(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireEnterpriseAdmin", () => {
    it("deve permitir ENTERPRISE_ADMIN", () => {
      const req = mockReq("ENTERPRISE_ADMIN");
      const res = mockRes();

      requireEnterpriseAdmin(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve permitir MASTER", () => {
      const req = mockReq("MASTER");
      const res = mockRes();

      requireEnterpriseAdmin(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear EMPLOYEE", () => {
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      requireEnterpriseAdmin(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireAdminOrMaster", () => {
    it("deve permitir MASTER", () => {
      const req = mockReq("MASTER");
      const res = mockRes();

      requireAdminOrMaster(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve permitir ENTERPRISE_ADMIN", () => {
      const req = mockReq("ENTERPRISE_ADMIN");
      const res = mockRes();

      requireAdminOrMaster(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear EMPLOYEE", () => {
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      requireAdminOrMaster(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireEmployeeOrAbove", () => {
    it("deve permitir MASTER", () => {
      const req = mockReq("MASTER");
      const res = mockRes();

      requireEmployeeOrAbove(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve permitir ENTERPRISE_ADMIN", () => {
      const req = mockReq("ENTERPRISE_ADMIN");
      const res = mockRes();

      requireEmployeeOrAbove(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve permitir EMPLOYEE", () => {
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      requireEmployeeOrAbove(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("isMaster", () => {
    it("deve retornar true para MASTER", () => {
      expect(isMaster(mockReq("MASTER") as any)).toBe(true);
    });

    it("deve retornar false para ENTERPRISE_ADMIN", () => {
      expect(isMaster(mockReq("ENTERPRISE_ADMIN") as any)).toBe(false);
    });

    it("deve retornar false para EMPLOYEE", () => {
      expect(isMaster(mockReq("EMPLOYEE") as any)).toBe(false);
    });

    it("deve retornar false para req sem user", () => {
      expect(isMaster(mockReq() as any)).toBe(false);
    });
  });

  describe("isEnterpriseAdmin", () => {
    it("deve retornar true para ENTERPRISE_ADMIN", () => {
      expect(isEnterpriseAdmin(mockReq("ENTERPRISE_ADMIN") as any)).toBe(true);
    });

    it("deve retornar false para MASTER", () => {
      expect(isEnterpriseAdmin(mockReq("MASTER") as any)).toBe(false);
    });

    it("deve retornar false para EMPLOYEE", () => {
      expect(isEnterpriseAdmin(mockReq("EMPLOYEE") as any)).toBe(false);
    });
  });

  describe("isEmployee", () => {
    it("deve retornar true para EMPLOYEE", () => {
      expect(isEmployee(mockReq("EMPLOYEE") as any)).toBe(true);
    });

    it("deve retornar false para MASTER", () => {
      expect(isEmployee(mockReq("MASTER") as any)).toBe(false);
    });

    it("deve retornar false para ENTERPRISE_ADMIN", () => {
      expect(isEmployee(mockReq("ENTERPRISE_ADMIN") as any)).toBe(false);
    });
  });

  describe("canManageCompany", () => {
    it("deve permitir MASTER gerenciar qualquer empresa", () => {
      const req = mockReq("MASTER", "any-company");
      expect(canManageCompany(req as any, "other-company")).toBe(true);
    });

    it("deve permitir ENTERPRISE_ADMIN gerenciar sua própria empresa", () => {
      const req = mockReq("ENTERPRISE_ADMIN", "company-1");
      expect(canManageCompany(req as any, "company-1")).toBe(true);
    });

    it("deve bloquear ENTERPRISE_ADMIN de gerenciar outra empresa", () => {
      const req = mockReq("ENTERPRISE_ADMIN", "company-1");
      expect(canManageCompany(req as any, "company-2")).toBe(false);
    });

    it("deve bloquear EMPLOYEE de gerenciar empresas", () => {
      const req = mockReq("EMPLOYEE", "company-1");
      expect(canManageCompany(req as any, "company-1")).toBe(false);
    });
  });

  describe("canAccessMasterRoutes", () => {
    it("deve retornar true para MASTER", () => {
      expect(canAccessMasterRoutes(mockReq("MASTER") as any)).toBe(true);
    });

    it("deve retornar false para ENTERPRISE_ADMIN", () => {
      expect(canAccessMasterRoutes(mockReq("ENTERPRISE_ADMIN") as any)).toBe(false);
    });

    it("deve retornar false para EMPLOYEE", () => {
      expect(canAccessMasterRoutes(mockReq("EMPLOYEE") as any)).toBe(false);
    });
  });
});

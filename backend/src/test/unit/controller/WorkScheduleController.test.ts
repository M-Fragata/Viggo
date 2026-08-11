import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExtendedPrisma = vi.hoisted(() => ({
  workSchedule: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  user: { findFirst: vi.fn(), update: vi.fn() },
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

import { WorkScheduleController } from "../../../controller/WorkScheduleController.js";

const UUID_WS = "550e8400-e29b-41d4-a716-446655440001";
const UUID_EMP = "550e8400-e29b-41d4-a716-446655440002";

describe("WorkScheduleController", () => {
  let controller: WorkScheduleController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new WorkScheduleController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
    };
  });

  describe("list", () => {
    it("deve listar horários da empresa", async () => {
      const mockSchedules = [
        { id: UUID_WS, name: "Comercial", companyId: "c1", _count: { users: 3 } },
      ];
      mockExtendedPrisma.workSchedule.findMany.mockResolvedValue(mockSchedules);

      req = { user: { companyId: "c1", role: "ENTERPRISE_ADMIN" } };

      await controller.list(req, res);

      expect(res.json).toHaveBeenCalledWith(mockSchedules);
    });

    it("deve retornar 403 quando não há companyId", async () => {
      req = { user: { companyId: null } };

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("create", () => {
    it("deve criar horário", async () => {
      const mockSchedule = { id: UUID_WS, name: "Comercial", companyId: "c1" };
      mockExtendedPrisma.workSchedule.create.mockResolvedValue(mockSchedule);

      req = {
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: {
          name: "Comercial",
          entryTime: 480,
          lunchStart: 720,
          lunchEnd: 840,
          exitTime: 1020,
        },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSchedule);
    });

    it("deve retornar 403 quando não é admin", async () => {
      req = {
        user: { companyId: "c1", role: "EMPLOYEE" },
        body: {
          name: "Comercial",
          entryTime: 480,
          lunchStart: 720,
          lunchEnd: 840,
          exitTime: 1020,
        },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Apenas administradores podem criar horários" });
    });

    it("deve retornar 400 com dados inválidos", async () => {
      req = {
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { name: "" },
      };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("update", () => {
    it("deve atualizar horário", async () => {
      mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue({ id: UUID_WS, companyId: "c1" });
      mockExtendedPrisma.workSchedule.update.mockResolvedValue({
        id: UUID_WS,
        name: "Updated",
      });

      req = {
        params: { id: UUID_WS },
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { name: "Updated" },
      };

      await controller.update(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated" }));
    });

    it("deve retornar 404 quando horário não existe", async () => {
      mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue(null);

      req = {
        params: { id: UUID_WS },
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { name: "Updated" },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 403 quando não é admin", async () => {
      req = {
        params: { id: UUID_WS },
        user: { companyId: "c1", role: "EMPLOYEE" },
        body: { name: "Updated" },
      };

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("remove", () => {
    it("deve remover horário sem funcionários", async () => {
      mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue({
        id: UUID_WS,
        companyId: "c1",
        _count: { users: 0 },
      });
      mockExtendedPrisma.workSchedule.delete.mockResolvedValue({});

      req = {
        params: { id: UUID_WS },
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
      };

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("deve retornar 400 quando horário tem funcionários", async () => {
      mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue({
        id: UUID_WS,
        companyId: "c1",
        _count: { users: 3 },
      });

      req = {
        params: { id: UUID_WS },
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
      };

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("3 funcionário(s)") })
      );
    });

    it("deve retornar 404 quando horário não existe", async () => {
      mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue(null);

      req = {
        params: { id: UUID_WS },
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
      };

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("assignToEmployee", () => {
    it("deve atribuir horário a funcionário", async () => {
      mockExtendedPrisma.user.findFirst.mockResolvedValue({ id: UUID_EMP, companyId: "c1" });
      mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue({ id: UUID_WS, companyId: "c1" });
      mockExtendedPrisma.user.update.mockResolvedValue({
        id: UUID_EMP,
        name: "João",
        workScheduleId: UUID_WS,
      });

      req = {
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { employeeId: UUID_EMP, workScheduleId: UUID_WS },
      };

      await controller.assignToEmployee(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ workScheduleId: UUID_WS })
      );
    });

    it("deve desatribuir horário (null)", async () => {
      mockExtendedPrisma.user.findFirst.mockResolvedValue({ id: UUID_EMP, companyId: "c1" });
      mockExtendedPrisma.user.update.mockResolvedValue({
        id: UUID_EMP,
        name: "João",
        workScheduleId: null,
      });

      req = {
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { employeeId: UUID_EMP, workScheduleId: null },
      };

      await controller.assignToEmployee(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ workScheduleId: null })
      );
    });

    it("deve retornar 404 quando funcionário não existe", async () => {
      mockExtendedPrisma.user.findFirst.mockResolvedValue(null);

      req = {
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { employeeId: UUID_EMP, workScheduleId: UUID_WS },
      };

      await controller.assignToEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Funcionário não encontrado" });
    });

    it("deve retornar 404 quando horário não existe na empresa", async () => {
      mockExtendedPrisma.user.findFirst.mockResolvedValue({ id: UUID_EMP, companyId: "c1" });
      mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue(null);

      req = {
        user: { companyId: "c1", role: "ENTERPRISE_ADMIN" },
        body: { employeeId: UUID_EMP, workScheduleId: UUID_WS },
      };

      await controller.assignToEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Horário não encontrado" });
    });
  });
});

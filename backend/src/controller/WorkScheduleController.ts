import { type Request, type Response } from "express";
import { z } from "zod";
import { extendedPrisma } from "../database/prisma-extensions.js";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  entryTime: z.number().min(0).max(1439), // 0-23:59 em minutos
  lunchStart: z.number().min(0).max(1439),
  lunchEnd: z.number().min(0).max(1439),
  exitTime: z.number().min(0).max(1439),
  daysOfWeek: z.number().min(1).max(127).default(31),
  jornadaTipo: z.enum(["5x2", "6x1", "12x36"]),
  checkinToleranceMinutes: z.number().min(0).max(60).default(5),
  lunchToleranceMinutes: z.number().min(0).max(120).default(15),
});

const updateSchema = createSchema.partial();

export class WorkScheduleController {
  async list(req: Request, res: Response) {
    try {
      const companyId = req.user.companyId;
      if (!companyId) return res.status(403).json({ message: "Acesso negado" });

      const schedules = await extendedPrisma.workSchedule.findMany({
        where: { companyId },
        include: {
          _count: { select: { users: true } },
        },
        orderBy: { name: "asc" },
      });

      return res.json(schedules);
    } catch (error) {
      console.error("Erro ao listar horários:", error);
      return res.status(500).json({ message: "Erro ao listar horários" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const companyId = req.user.companyId;
      if (!companyId) return res.status(403).json({ message: "Acesso negado" });

      if (req.user.role !== "ENTERPRISE_ADMIN") {
        return res.status(403).json({ message: "Apenas administradores podem criar horários" });
      }

      const data = createSchema.parse(req.body);

      const schedule = await extendedPrisma.workSchedule.create({
        data: { ...data, companyId },
      });

      return res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao criar horário:", error);
      return res.status(500).json({ message: "Erro ao criar horário" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const companyId = req.user.companyId;
      if (!companyId) return res.status(403).json({ message: "Acesso negado" });

      if (req.user.role !== "ENTERPRISE_ADMIN") {
        return res.status(403).json({ message: "Apenas administradores podem alterar horários" });
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
      const data = updateSchema.parse(req.body);

      const existing = await extendedPrisma.workSchedule.findFirst({
        where: { id, companyId },
      });
      if (!existing) {
        return res.status(404).json({ message: "Horário não encontrado" });
      }

      const schedule = await extendedPrisma.workSchedule.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.entryTime !== undefined && { entryTime: data.entryTime }),
          ...(data.lunchStart !== undefined && { lunchStart: data.lunchStart }),
          ...(data.lunchEnd !== undefined && { lunchEnd: data.lunchEnd }),
          ...(data.exitTime !== undefined && { exitTime: data.exitTime }),
          ...(data.daysOfWeek !== undefined && { daysOfWeek: data.daysOfWeek }),
          ...(data.jornadaTipo !== undefined && { jornadaTipo: data.jornadaTipo }),
          ...(data.checkinToleranceMinutes !== undefined && { checkinToleranceMinutes: data.checkinToleranceMinutes }),
          ...(data.lunchToleranceMinutes !== undefined && { lunchToleranceMinutes: data.lunchToleranceMinutes }),
        },
      });

      return res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao atualizar horário:", error);
      return res.status(500).json({ message: "Erro ao atualizar horário" });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const companyId = req.user.companyId;
      if (!companyId) return res.status(403).json({ message: "Acesso negado" });

      if (req.user.role !== "ENTERPRISE_ADMIN") {
        return res.status(403).json({ message: "Apenas administradores podem remover horários" });
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

      const existing = await extendedPrisma.workSchedule.findFirst({
        where: { id, companyId },
        include: { _count: { select: { users: true } } },
      });
      if (!existing) {
        return res.status(404).json({ message: "Horário não encontrado" });
      }
      if (existing._count.users > 0) {
        return res.status(400).json({
          message: `Este horário está atribuído a ${existing._count.users} funcionário(s). Desatribua antes de remover.`,
        });
      }

      await extendedPrisma.workSchedule.delete({ where: { id } });
      return res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao remover horário:", error);
      return res.status(500).json({ message: "Erro ao remover horário" });
    }
  }

  async assignToEmployee(req: Request, res: Response) {
    try {
      const companyId = req.user.companyId;
      if (!companyId) return res.status(403).json({ message: "Acesso negado" });

      if (req.user.role !== "ENTERPRISE_ADMIN") {
        return res.status(403).json({ message: "Apenas administradores podem atribuir horários" });
      }

      const { employeeId, workScheduleId } = z.object({
        employeeId: z.string().uuid(),
        workScheduleId: z.string().uuid().nullable(),
      }).parse(req.body);

      // Verificar se o funcionário pertence à empresa
      const employee = await extendedPrisma.user.findFirst({
        where: { id: employeeId, companyId },
      });
      if (!employee) {
        return res.status(404).json({ message: "Funcionário não encontrado" });
      }

      // Verificar se o horário pertence à empresa (se não for null)
      if (workScheduleId) {
        const schedule = await extendedPrisma.workSchedule.findFirst({
          where: { id: workScheduleId, companyId },
        });
        if (!schedule) {
          return res.status(404).json({ message: "Horário não encontrado" });
        }
      }

      const updated = await extendedPrisma.user.update({
        where: { id: employeeId },
        data: { workScheduleId },
        select: { id: true, name: true, workScheduleId: true },
      });

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao atribuir horário:", error);
      return res.status(500).json({ message: "Erro ao atribuir horário" });
    }
  }
}

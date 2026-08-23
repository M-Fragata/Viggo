import { type Request, type Response } from "express";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { prisma } from "../database/prisma.js";
import { z } from "zod";
import * as emailService from "../services/email/emailService.js";

export class JustificativaController {
  /**
   * POST /justificativas
   * Empregado registra justificativa de ausência/omissão.
   */
  async create(req: Request, res: Response) {
    const bodySchema = z.object({
      tipo: z.enum(["ABONO", "FALTA", "ATESTADO", "JUSTIFICATIVA_GERAL"]),
      descricao: z.string().min(10).max(500),
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      checkinId: z.string().uuid().optional(),
    });

    try {
      const { tipo, descricao, dataInicio, dataFim, checkinId } = bodySchema.parse(req.body);
      const userId = req.user.id;
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Se informou checkinId, verificar se pertence ao usuário e à empresa
      if (checkinId) {
        const checkin = await extendedPrisma.checkIn.findFirst({
          where: { id: checkinId, userId, companyId },
        });
        if (!checkin) {
          return res.status(404).json({ message: "Check-in não encontrado" });
        }
      }

      const justificativa = await extendedPrisma.justificativa.create({
        data: {
          tipo,
          descricao,
          dataInicio: new Date(dataInicio),
          dataFim: dataFim ? new Date(dataFim) : null,
          userId,
          companyId,
          checkinId: checkinId ?? null,
          aprovado: null,
        },
      });

      // Notifica admins (fire-and-forget)
      void (async () => {
        try {
          const admins = await prisma.user.findMany({
            where: { companyId, role: "ENTERPRISE_ADMIN" },
            select: { email: true },
          });
          if (admins.length > 0) {
            const employee = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            await emailService.sendJustificativaCreated({
              to: admins.map((a) => a.email),
              employeeName: employee?.name ?? "Colaborador",
              tipo,
              descricao,
              dataInicio: new Date(dataInicio),
              dataFim: dataFim ? new Date(dataFim) : null,
            });
          }
        } catch (err) {
          console.error("[Email] justificativa-created failed:", err);
        }
      })();

      return res.status(201).json(justificativa);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao criar justificativa:", error);
      return res
        .status(500)
        .json({ message: "Erro ao criar justificativa" });
    }
  }

  /**
   * GET /justificativas
   * Lista justificativas do usuário (ou da empresa se admin).
   */
  async list(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;
      const isAdmin = req.user.role === "ENTERPRISE_ADMIN";

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const where = isAdmin ? { companyId } : { userId, companyId };

      const justificativas = await extendedPrisma.justificativa.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.json(justificativas);
    } catch (error) {
      console.error("Erro ao listar justificativas:", error);
      return res
        .status(500)
        .json({ message: "Erro ao listar justificativas" });
    }
  }

  /**
   * PUT /justificativas/:id/aprovar
   * Admin aprova ou rejeita justificativa.
   */
  async approve(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ aprovado: z.boolean() });

    try {
      const { id } = paramsSchema.parse(req.params);
      const { aprovado } = bodySchema.parse(req.body);
      const companyId = req.user.companyId;

      if (req.user.role !== "ENTERPRISE_ADMIN") {
        return res
          .status(403)
          .json({ message: "Apenas administradores podem aprovar" });
      }

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const justificativa = await extendedPrisma.justificativa.findFirst({
        where: { id, companyId },
      });

      if (!justificativa) {
        return res
          .status(404)
          .json({ message: "Justificativa não encontrada" });
      }

      const updated = await extendedPrisma.justificativa.update({
        where: { id },
        data: {
          aprovado,
          aprovadoPor: req.user.id,
        },
      });

      // Notifica colaborador (fire-and-forget)
      void (async () => {
        try {
          const owner = await prisma.user.findUnique({ where: { id: justificativa.userId }, select: { name: true, email: true } });
          if (owner) {
            await emailService.sendJustificativaDecided({
              to: owner.email,
              employeeName: owner.name,
              tipo: justificativa.tipo,
              aprovado,
              dataInicio: justificativa.dataInicio,
            });
          }
        } catch (err) {
          console.error("[Email] justificativa-decided failed:", err);
        }
      })();

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao aprovar justificativa:", error);
      return res
        .status(500)
        .json({ message: "Erro ao aprovar justificativa" });
    }
  }
}

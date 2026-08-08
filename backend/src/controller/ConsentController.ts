import { type Request, type Response } from "express";
import { prisma } from "../database/prisma.js";
import { z } from "zod";

export class ConsentController {
  /**
   * POST /consentimentos
   * Registra consentimento do usuário (termos, política, biometria).
   */
  async create(req: Request, res: Response) {
    const bodySchema = z.object({
      tipo: z.enum(["TERMOS_DE_USO", "POLITICA_PRIVACIDADE", "BIOMETRIA", "DPA"]),
      versao: z.string().min(1),
      aceite: z.boolean(),
    });

    try {
      const { tipo, versao, aceite } = bodySchema.parse(req.body);
      const userId = req.user.id;

      const consentimento = await prisma.consentimento.upsert({
        where: {
          userId_tipo_versao: { userId, tipo, versao },
        },
        update: { aceite },
        create: {
          userId,
          tipo,
          versao,
          aceite,
          ip: req.ip ?? req.socket.remoteAddress ?? null,
        },
      });

      return res.status(201).json(consentimento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao registrar consentimento:", error);
      return res
        .status(500)
        .json({ message: "Erro ao registrar consentimento" });
    }
  }

  /**
   * GET /consentimentos
   * Lista consentimentos do usuário logado.
   */
  async list(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const consentimentos = await prisma.consentimento.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          tipo: true,
          versao: true,
          aceite: true,
          createdAt: true,
        },
      });

      return res.json(consentimentos);
    } catch (error) {
      console.error("Erro ao listar consentimentos:", error);
      return res
        .status(500)
        .json({ message: "Erro ao listar consentimentos" });
    }
  }
}

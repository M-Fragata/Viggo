import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { z } from "zod";

function parseParamId(rawId: string | string[] | undefined): string | null {
  if (!rawId) return null;
  return Array.isArray(rawId) ? (rawId[0] ?? null) : rawId;
}

export class WorkLocationController {
  /**
   * POST /work-locations
   * Cria um novo polo de trabalho com coordenadas geográficas e raio de tolerância.
   */
  async create(req: Request, res: Response) {
    const isAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";
    if (!isAdmin) {
      return res.status(403).json({ message: "Apenas administradores podem gerenciar polos de trabalho." });
    }

    const bodySchema = z.object({
      nome: z.string().min(3, "O nome do polo deve ter pelo menos 3 caracteres.").max(100),
      endereco: z.string().max(200).optional(),
      latitude: z.number().min(-90).max(90, "Latitude inválida."),
      longitude: z.number().min(-180).max(180, "Longitude inválida."),
      raioMetros: z.coerce.number().min(20, "O raio mínimo de tolerância é de 20 metros.").max(50000, "O raio máximo é de 50 km.").default(100),
    });

    try {
      const { nome, endereco, latitude, longitude, raioMetros } = bodySchema.parse(req.body);
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado: empresa não identificada." });
      }

      const polo = await extendedPrisma.workLocation.create({
        data: {
          companyId,
          nome,
          endereco: endereco ?? null,
          latitude,
          longitude,
          raioMetros,
          ativo: true,
        },
      });

      return res.status(201).json({
        message: "Polo de trabalho cadastrado com sucesso!",
        polo,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao criar polo de trabalho:", error);
      return res.status(500).json({ message: "Erro interno ao cadastrar polo de trabalho." });
    }
  }

  /**
   * GET /work-locations
   * Lista todos os polos de trabalho da empresa com métricas de registros vinculados.
   */
  async list(req: Request, res: Response) {
    try {
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado: empresa não identificada." });
      }

      const polos = await extendedPrisma.workLocation.findMany({
        where: { companyId },
        orderBy: [{ ativo: "desc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: { checkIns: true },
          },
        },
      });

      return res.status(200).json(polos);
    } catch (error) {
      console.error("Erro ao listar polos de trabalho:", error);
      return res.status(500).json({ message: "Erro ao listar polos de trabalho." });
    }
  }

  /**
   * PUT /work-locations/:id
   * Atualiza dados de um polo de trabalho existente com exactOptionalPropertyTypes.
   */
  async update(req: Request, res: Response) {
    const isAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";
    if (!isAdmin) {
      return res.status(403).json({ message: "Apenas administradores podem gerenciar polos de trabalho." });
    }

    const id = parseParamId(req.params.id);
    const bodySchema = z.object({
      nome: z.string().min(3).max(100).optional(),
      endereco: z.string().max(200).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      raioMetros: z.coerce.number().min(20).max(50000).optional(),
      ativo: z.boolean().optional(),
    });

    try {
      const data = bodySchema.parse(req.body);
      const companyId = req.user.companyId;

      if (!companyId || !id) {
        return res.status(400).json({ message: "Identificador inválido ou empresa não identificada." });
      }

      const poloExistente = await extendedPrisma.workLocation.findFirst({
        where: { id, companyId },
      });

      if (!poloExistente) {
        return res.status(404).json({ message: "Polo de trabalho não encontrado." });
      }

      // Constrói objeto de atualização estrito (compatível com exactOptionalPropertyTypes)
      const updateData: Prisma.WorkLocationUpdateInput = {};
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.endereco !== undefined) updateData.endereco = data.endereco;
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.raioMetros !== undefined) updateData.raioMetros = data.raioMetros;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;

      const poloAtualizado = await extendedPrisma.workLocation.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        message: "Polo de trabalho atualizado com sucesso!",
        polo: poloAtualizado,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao atualizar polo de trabalho:", error);
      return res.status(500).json({ message: "Erro ao atualizar polo de trabalho." });
    }
  }

  /**
   * DELETE /work-locations/:id
   * Exclui ou desativa polo mantendo integridade histórica dos registros fiscais.
   */
  async remove(req: Request, res: Response) {
    const isAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";
    if (!isAdmin) {
      return res.status(403).json({ message: "Apenas administradores podem gerenciar polos de trabalho." });
    }

    const id = parseParamId(req.params.id);
    const companyId = req.user.companyId;

    if (!companyId || !id) {
      return res.status(400).json({ message: "Identificador inválido ou empresa não identificada." });
    }

    try {
      const polo = await extendedPrisma.workLocation.findFirst({
        where: { id, companyId },
        include: {
          _count: { select: { checkIns: true } },
        },
      });

      if (!polo) {
        return res.status(404).json({ message: "Polo de trabalho não encontrado." });
      }

      // Se houver check-ins vinculados ao polo, apenas desativa para preservar integridade fiscal
      if (polo._count.checkIns > 0) {
        await extendedPrisma.workLocation.update({
          where: { id },
          data: { ativo: false },
        });

        return res.status(200).json({
          message: "O polo possui registros de ponto vinculados e foi desativado para preservar o histórico fiscal.",
          desativado: true,
        });
      }

      // Se não houver check-ins vinculados, pode deletar fisicamente
      await extendedPrisma.workLocation.delete({
        where: { id },
      });

      return res.status(200).json({
        message: "Polo de trabalho removido com sucesso!",
        removido: true,
      });
    } catch (error) {
      console.error("Erro ao remover polo de trabalho:", error);
      return res.status(500).json({ message: "Erro ao remover polo de trabalho." });
    }
  }
}

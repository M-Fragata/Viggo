import type { Request, Response } from "express";
import type { Prisma, CheckInType } from "@prisma/client";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { prisma } from "../database/prisma.js";
import { z } from "zod";
import * as emailService from "../services/email/emailService.js";
import {
  salvarComprovanteEmDisco,
  resolverCaminhoComprovante,
} from "../services/comprovanteStorageService.js";

function parseParamId(rawId: string | string[] | undefined): string | null {
  if (!rawId) return null;
  return Array.isArray(rawId) ? (rawId[0] ?? null) : rawId;
}

export class JustificativaController {
  /**
   * POST /justificativas
   * Colaborador registra solicitação de ajuste de ponto, atestado médico ou declaração.
   */
  async create(req: Request, res: Response) {
    const bodySchema = z.object({
      tipo: z.enum([
        "ESQUECIMENTO_PONTO",
        "ATESTADO_MEDICO",
        "DECLARACAO_COMPARECIMENTO",
        "ABONO_FALTA",
        "OUTRO",
        "ABONO",
        "FALTA",
        "ATESTADO",
        "JUSTIFICATIVA_GERAL",
      ]),
      descricao: z.string().min(5, "A descrição deve ter no mínimo 5 caracteres.").max(1000),
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de início inválida (formato AAAA-MM-DD)."),
      dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de término inválida.").optional(),
      horarioAjustado: z.string().regex(/^\d{2}:\d{2}$/, "Horário ajustado deve estar no formato HH:MM.").optional(),
      tipoBatidaAjuste: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]).optional(),
      diasAfastamento: z.coerce.number().min(1).max(365).optional().default(1),
      checkinId: z.string().uuid().optional(),
      arquivo: z
        .object({
          nomeOriginal: z.string().min(1).max(150),
          mimeType: z.string().min(1),
          conteudoBase64: z.string().min(1),
        })
        .optional(),
    });

    try {
      const {
        tipo,
        descricao,
        dataInicio,
        dataFim,
        horarioAjustado,
        tipoBatidaAjuste,
        diasAfastamento,
        checkinId,
        arquivo,
      } = bodySchema.parse(req.body);

      const userId = req.user.id;
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado: empresa não identificada." });
      }

      // Se informou checkinId, verificar se pertence ao usuário e à empresa
      if (checkinId) {
        const checkin = await extendedPrisma.checkIn.findFirst({
          where: { id: checkinId, userId, companyId },
        });
        if (!checkin) {
          return res.status(404).json({ message: "Registro de ponto de referência não encontrado." });
        }
      }

      // Processar anexo físico em disco se fornecido (com limite estrito de 4MB nativo)
      let comprovantePath: string | null = null;
      let comprovanteNomeOriginal: string | null = null;
      let comprovanteTamanho: number | null = null;
      let comprovanteMimeType: string | null = null;

      if (arquivo) {
        const resultadoUpload = await salvarComprovanteEmDisco({
          companyId,
          nomeOriginal: arquivo.nomeOriginal,
          mimeType: arquivo.mimeType,
          conteudoBase64: arquivo.conteudoBase64,
        });

        comprovantePath = resultadoUpload.caminhoRelativo;
        comprovanteNomeOriginal = resultadoUpload.nomeOriginal;
        comprovanteTamanho = resultadoUpload.tamanhoBytes;
        comprovanteMimeType = resultadoUpload.mimeType;
      }

      const justificativa = await extendedPrisma.justificativa.create({
        data: {
          tipo,
          descricao,
          dataInicio: new Date(dataInicio),
          dataFim: dataFim ? new Date(dataFim) : null,
          horarioAjustado: horarioAjustado ?? null,
          tipoBatidaAjuste: (tipoBatidaAjuste as CheckInType) ?? null,
          diasAfastamento: diasAfastamento ?? 1,
          comprovantePath,
          comprovanteNomeOriginal,
          comprovanteTamanho,
          comprovanteMimeType,
          userId,
          companyId,
          checkinId: checkinId ?? null,
          aprovado: null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Notifica admins por e-mail (fire-and-forget)
      void (async () => {
        try {
          const admins = await prisma.user.findMany({
            where: { companyId, role: "ENTERPRISE_ADMIN" },
            select: { email: true },
          });
          if (admins.length > 0) {
            const employee = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true },
            });
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

      return res.status(201).json({
        message: "Solicitação enviada com sucesso ao departamento de RH!",
        justificativa,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      const erroMsg = error instanceof Error ? error.message : "Erro ao registrar solicitação.";
      console.error("Erro ao criar justificativa:", error);
      return res.status(400).json({ message: erroMsg });
    }
  }

  /**
   * GET /justificativas
   * Lista solicitações do colaborador logado ou todas da empresa se for admin.
   */
  async list(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;
      const isAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado: empresa não identificada." });
      }

      const { status, tipo } = req.query;

      const where: Prisma.JustificativaWhereInput = {
        companyId,
        ...(!isAdmin ? { userId } : {}),
      };

      if (status === "PENDENTE") {
        where.aprovado = null;
      } else if (status === "APROVADO") {
        where.aprovado = true;
      } else if (status === "REJEITADO" || status === "RECUSADO") {
        where.aprovado = false;
      }

      if (tipo && typeof tipo === "string" && tipo !== "TODOS") {
        where.tipo = tipo;
      }

      const justificativas = await extendedPrisma.justificativa.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(200).json(justificativas);
    } catch (error) {
      console.error("Erro ao listar justificativas:", error);
      return res.status(500).json({ message: "Erro ao listar justificativas." });
    }
  }

  /**
   * PUT /justificativas/:id/aprovar
   * Admin aprova ou recusa solicitação de justificativa / ajuste de ponto.
   */
  async approve(req: Request, res: Response) {
    const id = parseParamId(req.params.id);
    const bodySchema = z.object({
      aprovado: z.boolean(),
      motivoRecusa: z.string().max(500).optional(),
    });

    try {
      const { aprovado, motivoRecusa } = bodySchema.parse(req.body);
      const companyId = req.user.companyId;
      const isEnterpriseAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";

      if (!isEnterpriseAdmin) {
        return res.status(403).json({ message: "Apenas administradores podem avaliar solicitações." });
      }

      if (!companyId || !id) {
        return res.status(400).json({ message: "Identificador inválido ou empresa não identificada." });
      }

      const justificativa = await extendedPrisma.justificativa.findFirst({
        where: { id, companyId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      if (!justificativa) {
        return res.status(404).json({ message: "Solicitação não encontrada." });
      }

      let checkinCriadoId: string | null = null;

      // Se for APROVADO e for ESQUECIMENTO_PONTO com horário informado:
      // Cria a marcação oficial no CheckIn com auditoria (Portaria 671 MTE Art. 80)
      if (aprovado && justificativa.tipo === "ESQUECIMENTO_PONTO" && justificativa.horarioAjustado && justificativa.tipoBatidaAjuste) {
        const parts = justificativa.horarioAjustado.split(":");
        const horas = Number(parts[0] ?? 0);
        const minutos = Number(parts[1] ?? 0);
        const dataBatida = new Date(justificativa.dataInicio);
        dataBatida.setHours(horas, minutos, 0, 0);

        // Obter próximo NSR sequencial da empresa
        const ultimoCheckin = await extendedPrisma.checkIn.findFirst({
          where: { companyId },
          orderBy: { nsr: "desc" },
          select: { nsr: true },
        });
        const proximoNsr = (ultimoCheckin?.nsr ?? 0) + 1;

        const company = await extendedPrisma.company.findUnique({
          where: { id: companyId },
          select: { cnpj: true },
        });

        const novoCheckin = await extendedPrisma.checkIn.create({
          data: {
            companyId,
            userId: justificativa.userId,
            nsr: proximoNsr,
            ano: dataBatida.getFullYear(),
            type: justificativa.tipoBatidaAjuste,
            createdAt: dataBatida,
            employerCnpj: company?.cnpj ?? "",
            address: `Ajuste aprovado pelo RH (Solicitação #${justificativa.id.slice(0, 8)})`,
          },
        });

        checkinCriadoId = novoCheckin.id;
      }

      const updated = await extendedPrisma.justificativa.update({
        where: { id },
        data: {
          aprovado,
          aprovadoPor: req.user.id,
          motivoRecusa: !aprovado ? motivoRecusa ?? "Solicitação recusada pelo RH." : null,
          ...(checkinCriadoId ? { checkinId: checkinCriadoId } : {}),
        },
      });

      // Notifica colaborador por e-mail (fire-and-forget)
      void (async () => {
        try {
          if (justificativa.user?.email) {
            await emailService.sendJustificativaDecided({
              to: justificativa.user.email,
              employeeName: justificativa.user.name,
              tipo: justificativa.tipo,
              aprovado,
              dataInicio: justificativa.dataInicio,
            });
          }
        } catch (err) {
          console.error("[Email] justificativa-decided failed:", err);
        }
      })();

      return res.status(200).json({
        message: aprovado
          ? "Solicitação aprovada com sucesso! Ajustes refletidos no ponto do colaborador."
          : "Solicitação recusada com sucesso.",
        justificativa: updated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao avaliar justificativa:", error);
      return res.status(500).json({ message: "Erro interno ao avaliar solicitação." });
    }
  }

  /**
   * GET /justificativas/:id/comprovante
   * Download seguro do comprovante anexo (Art. 11 LGPD - Proteção de dados de saúde).
   */
  async downloadComprovante(req: Request, res: Response) {
    const id = parseParamId(req.params.id);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";

    if (!companyId || !id) {
      return res.status(400).json({ message: "Identificador inválido ou empresa não identificada." });
    }

    try {
      const justificativa = await extendedPrisma.justificativa.findFirst({
        where: {
          id,
          companyId,
          ...(!isAdmin ? { userId } : {}),
        },
        select: {
          comprovantePath: true,
          comprovanteNomeOriginal: true,
          comprovanteMimeType: true,
        },
      });

      if (!justificativa || !justificativa.comprovantePath) {
        return res.status(404).json({ message: "Comprovante não encontrado para esta solicitação." });
      }

      const caminhoAbsoluto = await resolverCaminhoComprovante(
        companyId,
        justificativa.comprovantePath
      );

      const nomeDownload = justificativa.comprovanteNomeOriginal || "comprovante";
      res.setHeader("Content-Type", justificativa.comprovanteMimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${nomeDownload}"`);

      return res.sendFile(caminhoAbsoluto);
    } catch (error) {
      console.error("Erro ao obter comprovante:", error);
      return res.status(500).json({ message: "Erro ao carregar anexo do comprovante." });
    }
  }
}

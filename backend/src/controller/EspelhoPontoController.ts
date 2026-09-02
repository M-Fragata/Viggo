import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import { extendedPrisma } from "../database/prisma-extensions.js";
import {
  consolidarEspelhoFuncionario,
  gerarEspelhoPdf,
  type EspelhoPontoDadosPdf,
  type EmpresaDadosPdf,
  type ColaboradorDadosPdf,
} from "../services/espelhoPontoService.js";

function parseParamId(rawId: string | string[] | undefined): string | null {
  if (!rawId) return null;
  return Array.isArray(rawId) ? (rawId[0] ?? null) : rawId;
}

export class EspelhoPontoController {
  /**
   * RH libera espelhos de ponto para assinatura no mês especificado.
   * Multi-tenancy: restrito à companyId do administrador logado.
   */
  async liberarFechamento(req: Request, res: Response) {
    const schema = z.object({
      year: z.coerce.number().min(2020).max(2100),
      month: z.coerce.number().min(1).max(12),
      userId: z.string().uuid().optional(),
    });

    try {
      const { year, month, userId } = schema.parse(req.body);
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado: empresa não identificada." });
      }

      // Buscar colaboradores ativos da empresa com filtro estrito de multi-tenancy
      const whereEmployee: Prisma.UserWhereInput = {
        companyId,
        status: "ACTIVE",
        role: "EMPLOYEE",
        ...(userId ? { id: userId } : {}),
      };

      const employees = await extendedPrisma.user.findMany({
        where: whereEmployee,
        select: { id: true, name: true },
      });

      if (employees.length === 0) {
        return res.status(404).json({ message: "Nenhum colaborador encontrado para fechamento." });
      }

      let criados = 0;
      let atualizados = 0;

      for (const emp of employees) {
        try {
          const consolidado = await consolidarEspelhoFuncionario(companyId, emp.id, year, month);

          const existing = await extendedPrisma.espelhoPonto.findUnique({
            where: {
              companyId_userId_ano_mes: {
                companyId,
                userId: emp.id,
                ano: year,
                mes: month,
              },
            },
          });

          if (existing) {
            await extendedPrisma.espelhoPonto.update({
              where: { id: existing.id },
              data: {
                periodoInicio: consolidado.periodoInicio,
                periodoFim: consolidado.periodoFim,
                hashDocumento: consolidado.hashDocumento,
                resumoHoras: consolidado.resumoHoras as unknown as Prisma.InputJsonValue,
                detalhesDias: consolidado.detalhesDias as unknown as Prisma.InputJsonValue,
                status: "LIBERADO", // Reseta para nova conferência caso seja reliberado
                motivoRecusa: null,
                dataContestacao: null,
              },
            });
            atualizados++;
          } else {
            await extendedPrisma.espelhoPonto.create({
              data: {
                companyId,
                userId: emp.id,
                ano: year,
                mes: month,
                periodoInicio: consolidado.periodoInicio,
                periodoFim: consolidado.periodoFim,
                hashDocumento: consolidado.hashDocumento,
                resumoHoras: consolidado.resumoHoras as unknown as Prisma.InputJsonValue,
                detalhesDias: consolidado.detalhesDias as unknown as Prisma.InputJsonValue,
                status: "LIBERADO",
              },
            });
            criados++;
          }
        } catch (empErr) {
          console.warn(`Erro ao consolidar espelho para colaborador ${emp.id}:`, empErr);
        }
      }

      return res.status(200).json({
        message: "Fechamento processado e espelhos liberados para assinatura com sucesso!",
        totalColaboradores: employees.length,
        espelhosCriados: criados,
        espelhosAtualizados: atualizados,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues });
      }
      console.error("Erro ao liberar fechamento de espelhos:", error);
      return res.status(500).json({ message: "Erro interno ao liberar fechamento de espelhos." });
    }
  }

  /**
   * Lista todos os espelhos do mês para o RH da empresa logada com estatísticas.
   */
  async listarEspelhosEmpresa(req: Request, res: Response) {
    const schema = z.object({
      year: z.coerce.number().min(2020).max(2100).default(new Date().getFullYear()),
      month: z.coerce.number().min(1).max(12).default(new Date().getMonth() + 1),
    });

    try {
      const { year, month } = schema.parse(req.query);
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado." });
      }

      // Buscar todos os funcionários da empresa
      const employees = await extendedPrisma.user.findMany({
        where: { companyId, role: "EMPLOYEE", status: "ACTIVE" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });

      // Buscar espelhos já gerados para o mês
      const espelhos = await extendedPrisma.espelhoPonto.findMany({
        where: { companyId, ano: year, mes: month },
        select: {
          id: true,
          userId: true,
          status: true,
          hashDocumento: true,
          resumoHoras: true,
          assinadoEm: true,
          motivoRecusa: true,
          updatedAt: true,
        },
      });

      const espelhoMap = new Map(espelhos.map((e) => [e.userId, e]));

      let totalLiberados = 0;
      let totalAssinados = 0;
      let totalContestados = 0;
      let totalNaoGerados = 0;

      const items = employees.map((emp) => {
        const espelho = espelhoMap.get(emp.id);
        if (!espelho) {
          totalNaoGerados++;
          return {
            userId: emp.id,
            userName: emp.name,
            userEmail: emp.email,
            hasEspelho: false,
            status: "NAO_GERADO",
          };
        }

        if (espelho.status === "ASSINADO") totalAssinados++;
        else if (espelho.status === "CONTESTADO") totalContestados++;
        else totalLiberados++;

        return {
          id: espelho.id,
          userId: emp.id,
          userName: emp.name,
          userEmail: emp.email,
          hasEspelho: true,
          status: espelho.status,
          resumoHoras: espelho.resumoHoras,
          assinadoEm: espelho.assinadoEm,
          motivoRecusa: espelho.motivoRecusa,
          updatedAt: espelho.updatedAt,
        };
      });

      return res.status(200).json({
        year,
        month,
        totalColaboradores: employees.length,
        stats: {
          total: employees.length,
          assinados: totalAssinados,
          pendentes: totalLiberados,
          contestados: totalContestados,
          naoGerados: totalNaoGerados,
          percentualAssinado:
            employees.length > 0
              ? Math.round((totalAssinados / (employees.length - totalNaoGerados || 1)) * 100)
              : 0,
        },
        items,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues });
      }
      console.error("Erro ao listar espelhos da empresa:", error);
      return res.status(500).json({ message: "Erro interno ao listar espelhos da empresa." });
    }
  }

  /**
   * Colaborador lista seus próprios espelhos de ponto.
   */
  async listarMeusEspelhos(req: Request, res: Response) {
    const companyId = req.user.companyId;
    const userId = req.user.id;

    if (!companyId || !userId) {
      return res.status(403).json({ message: "Acesso negado: dados de autenticação incompletos." });
    }

    try {
      const espelhos = await extendedPrisma.espelhoPonto.findMany({
        where: { companyId, userId },
        orderBy: [{ ano: "desc" }, { mes: "desc" }],
        select: {
          id: true,
          ano: true,
          mes: true,
          status: true,
          resumoHoras: true,
          assinadoEm: true,
          motivoRecusa: true,
          createdAt: true,
        },
      });

      return res.status(200).json(espelhos);
    } catch (error) {
      console.error("Erro ao listar meus espelhos:", error);
      return res.status(500).json({ message: "Erro ao buscar seus espelhos de ponto." });
    }
  }

  /**
   * Obter detalhes completos de um espelho (dia a dia).
   */
  async obterEspelhoDetalhes(req: Request, res: Response) {
    const id = parseParamId(req.params.id);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const isEnterpriseAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";

    if (!companyId || !id) {
      return res.status(403).json({ message: "Acesso negado ou identificador ausente." });
    }

    try {
      const whereClause: Prisma.EspelhoPontoWhereInput = {
        id,
        companyId,
        ...(!isEnterpriseAdmin ? { userId } : {}),
      };

      const espelho = await extendedPrisma.espelhoPonto.findFirst({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true, cpf: true } },
          company: { select: { name: true, cnpj: true } },
        },
      });

      if (!espelho) {
        return res.status(404).json({ message: "Espelho de ponto não encontrado." });
      }

      return res.status(200).json(espelho);
    } catch (error) {
      console.error("Erro ao buscar detalhes do espelho:", error);
      return res.status(500).json({ message: "Erro ao buscar detalhes do espelho." });
    }
  }

  /**
   * Assinar eletronicamente o espelho de ponto (Art. 83 Portaria 671 MTE / Lei 14.063).
   */
  async assinarEspelho(req: Request, res: Response) {
    const id = parseParamId(req.params.id);
    const schema = z.object({
      password: z.string().min(1, "A senha é obrigatória para assinar digitalmente."),
    });

    try {
      const { password } = schema.parse(req.body);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      if (!companyId || !userId || !id) {
        return res.status(403).json({ message: "Acesso negado: dados de autenticação incompletos." });
      }

      // Buscar colaborador para validar senha
      const user = await extendedPrisma.user.findFirst({
        where: { id: userId, companyId },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ message: "Senha incorreta. Não foi possível confirmar a assinatura." });
      }

      const espelho = await extendedPrisma.espelhoPonto.findFirst({
        where: { id, companyId, userId },
      });

      if (!espelho) {
        return res.status(404).json({ message: "Espelho de ponto não encontrado." });
      }

      if (espelho.status === "ASSINADO") {
        return res.status(400).json({ message: "Este espelho já foi assinado anteriormente." });
      }

      const clientIpRaw = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const clientIp = Array.isArray(clientIpRaw) ? clientIpRaw[0] : clientIpRaw.split(",")[0]?.trim() || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "Viggo Web/App";

      const espelhoAssinado = await extendedPrisma.espelhoPonto.update({
        where: { id: espelho.id },
        data: {
          status: "ASSINADO",
          assinadoEm: new Date(),
          ipAssinatura: clientIp,
          userAgent,
          metodoAuth: "SENHA",
          motivoRecusa: null,
        },
      });

      // Registrar no log de auditoria
      await extendedPrisma.auditLog.create({
        data: {
          userId,
          companyId,
          action: "ASSINAR_ESPELHO_PONTO",
          entity: "EspelhoPonto",
          entityId: espelho.id,
          ip: clientIp,
          userAgent,
          legalBasis: "Art. 83 Portaria 671/2021 MTE e Lei 14.063/2020",
          purpose: "Assinatura eletrônica avançada de espelho de ponto",
          newData: {
            status: "ASSINADO",
            hashDocumento: espelho.hashDocumento,
            ano: espelho.ano,
            mes: espelho.mes,
          },
        },
      });

      return res.status(200).json({
        message: "Espelho de ponto assinado eletronicamente com sucesso!",
        espelho: espelhoAssinado,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao assinar espelho:", error);
      return res.status(500).json({ message: "Erro interno ao assinar espelho de ponto." });
    }
  }

  /**
   * Colaborador contesta o espelho de ponto e solicita correção ao RH.
   */
  async contestarEspelho(req: Request, res: Response) {
    const id = parseParamId(req.params.id);
    const schema = z.object({
      motivo: z.string().min(5, "Descreva detalhadamente o motivo da solicitação de correção."),
    });

    try {
      const { motivo } = schema.parse(req.body);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      if (!companyId || !userId || !id) {
        return res.status(403).json({ message: "Acesso negado: dados de autenticação incompletos." });
      }

      const espelho = await extendedPrisma.espelhoPonto.findFirst({
        where: { id, companyId, userId },
      });

      if (!espelho) {
        return res.status(404).json({ message: "Espelho de ponto não encontrado." });
      }

      const atualizado = await extendedPrisma.espelhoPonto.update({
        where: { id: espelho.id },
        data: {
          status: "CONTESTADO",
          motivoRecusa: motivo,
          dataContestacao: new Date(),
        },
      });

      return res.status(200).json({
        message: "Solicitação de correção enviada com sucesso para o RH da sua empresa.",
        espelho: atualizado,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("Erro ao contestar espelho:", error);
      return res.status(500).json({ message: "Erro interno ao contestar espelho de ponto." });
    }
  }

  /**
   * Download do PDF oficial com carimbo de assinatura.
   */
  async downloadEspelhoPdf(req: Request, res: Response) {
    const id = parseParamId(req.params.id);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const isEnterpriseAdmin = req.user.role === "ENTERPRISE_ADMIN" || req.user.role === "MASTER";

    if (!companyId || !id) {
      return res.status(403).json({ message: "Acesso negado ou identificador ausente." });
    }

    try {
      const whereClause: Prisma.EspelhoPontoWhereInput = {
        id,
        companyId,
        ...(!isEnterpriseAdmin ? { userId } : {}),
      };

      const espelho = await extendedPrisma.espelhoPonto.findFirst({
        where: whereClause,
        include: {
          company: { select: { name: true, cnpj: true } },
          user: { select: { name: true, cpf: true } },
        },
      });

      if (!espelho) {
        return res.status(404).json({ message: "Espelho de ponto não encontrado." });
      }

      const dadosPdf: EspelhoPontoDadosPdf = {
        ano: espelho.ano,
        mes: espelho.mes,
        status: espelho.status,
        hashDocumento: espelho.hashDocumento,
        assinadoEm: espelho.assinadoEm,
        ipAssinatura: espelho.ipAssinatura,
        userAgent: espelho.userAgent,
        metodoAuth: espelho.metodoAuth,
        motivoRecusa: espelho.motivoRecusa,
        detalhesDias: espelho.detalhesDias,
        resumoHoras: espelho.resumoHoras,
      };

      const empresaPdf: EmpresaDadosPdf = {
        name: espelho.company.name,
        cnpj: espelho.company.cnpj,
      };

      const colaboradorPdf: ColaboradorDadosPdf = {
        name: espelho.user.name,
        cpf: espelho.user.cpf,
      };

      const pdfBuffer = await gerarEspelhoPdf(dadosPdf, empresaPdf, colaboradorPdf);

      const filename = `ESPELHO_PONTO_${espelho.ano}_${String(espelho.mes).padStart(2, "0")}_${espelho.user.name.replace(/\s+/g, "_")}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Hash-SHA256", espelho.hashDocumento);

      return res.send(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar PDF do espelho:", error);
      return res.status(500).json({ message: "Erro ao gerar PDF do espelho de ponto." });
    }
  }
}

import { type Request, type Response } from "express";
import { z } from "zod";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { decryptCpf } from "../utils/cpfEncryption.js";
import { signContent } from "../utils/afSignature.js";

/**
 * AEJ - Arquivo Eletrônico de Jornada
 * Portaria MTE 671/2021, Art. 78, §5º-B - leiaute definido no Anexo V
 *
 * Formato: arquivo texto com registros separados por pipe (|)
 * Registros:
 *   Tipo 1 - Header Empresa (1 por arquivo)
 *   Tipo 2 - Horário Contratual (1 por empregado com WorkSchedule)
 *   Tipo 3 - Marcações de ponto (1 por batida)
 *   Tipo 9 - Trailer (1 por arquivo)
 *
 * Reusa padrão do AfdController (Anexo II) com adição do Tipo 2.
 * P0-3: pronto para assinatura A1 via CERT_A1_PATH/CERT_A1_PASSWORD no .env
 * — quando cert preenchido, afSignature assina hash; sem cert, apenas hash.
 */

function formatDateAej(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function mapCheckinTypeToAejCode(type: string): string {
  const map: Record<string, string> = {
    ENTRY: "1",
    LUNCH_START: "2",
    LUNCH_END: "3",
    EXIT: "4",
  };
  return map[type] ?? "0";
}

function formatMinutesHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export class AejController {
  /**
   * GET /checkins/export/aej?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   *
   * Gera o AEJ conforme Anexo V da Portaria 671/2021.
   * Multi-tenancy: extendedPrisma + filtro explícito companyId (P0-5).
   */
  async exportAej(req: Request, res: Response) {
    const querySchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate deve estar no formato YYYY-MM-DD"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate deve estar no formato YYYY-MM-DD"),
    });

    try {
      const { startDate, endDate } = querySchema.parse(req.query);

      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const company = await extendedPrisma.company.findUnique({
        where: { id: companyId },
        select: { cnpj: true, name: true },
      });

      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      if (!company.cnpj) {
        return res.status(400).json({ message: "CNPJ da empresa é obrigatório para gerar o AEJ" });
      }

      const cnpjClean = company.cnpj.replace(/\D/g, "");

      // Checkins do período (raw, cru — Port.671 Art.80)
      const checkins = await extendedPrisma.checkIn.findMany({
        where: {
          companyId,
          createdAt: {
            gte: new Date(`${startDate}T00:00:00`),
            lte: new Date(`${endDate}T23:59:59`),
          },
        },
        orderBy: [{ ano: "asc" }, { nsr: "asc" }],
        include: {
          user: { select: { cpf: true, name: true } },
        },
      });

      // Funcionários com WorkSchedule para Tipo 2
      const employees = await extendedPrisma.user.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          cpf: true,
          workSchedule: {
            select: {
              name: true,
              entryTime: true,
              lunchStart: true,
              lunchEnd: true,
              exitTime: true,
              daysOfWeek: true,
            },
          },
        },
      });

      const lines: string[] = [];

      // --- Header (Tipo 1) ---
      const dataIni = formatDateAej(new Date(`${startDate}T00:00:00`));
      const dataFim = formatDateAej(new Date(`${endDate}T23:59:59`));
      lines.push(["1", cnpjClean, "", company.name, dataIni, dataFim].join("|"));

      // --- Tipo 2 — Horário Contratual por empregado ---
      for (const emp of employees) {
        const cpf = decryptCpf(emp.cpf ?? "").replace(/\D/g, "");
        if (!emp.workSchedule) continue;
        const ws = emp.workSchedule;
        const horario =
          `${formatMinutesHHMM(ws.entryTime)}|` +
          `${formatMinutesHHMM(ws.lunchStart)}|` +
          `${formatMinutesHHMM(ws.lunchEnd)}|` +
          `${formatMinutesHHMM(ws.exitTime)}`;
        lines.push(["2", cnpjClean, cpf, ws.name, horario, String(ws.daysOfWeek)].join("|"));
      }

      // --- Tipo 3 — Marcações ---
      for (const checkin of checkins) {
        const cpf = decryptCpf(checkin.user?.cpf ?? "").replace(/\D/g, "");
        const dataHora = formatDateAej(checkin.createdAt);
        const codigo = mapCheckinTypeToAejCode(checkin.type);
        const nsrFmt = String(checkin.nsr).padStart(6, "0");
        const cnpjEmpregador = checkin.employerCnpj.replace(/\D/g, "");
        lines.push(["3", cnpjEmpregador, cpf, nsrFmt, dataHora, codigo].join("|"));
      }

      // --- Trailer (Tipo 9) ---
      lines.push(["9", cnpjClean, String(checkins.length).padStart(6, "0")].join("|"));

      const content = lines.join("\n");
      const { hash, assinado, assinatura, erro } = signContent(content);
      const filename = `AEJ_${cnpjClean}_${startDate}_${endDate}.txt`;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Hash-SHA256", hash);
      if (assinado && assinatura) {
        res.setHeader("X-Signature", assinatura);
      }
      if (erro) {
        res.setHeader("X-Signature-Error", erro);
      }

      return res.send(content + `\nHASH: ${hash}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues });
      }
      console.error("Erro ao gerar AEJ:", error);
      return res.status(500).json({ message: "Erro ao gerar AEJ" });
    }
  }
}

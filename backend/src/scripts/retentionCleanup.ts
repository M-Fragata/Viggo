import { prisma } from "../database/prisma.js";
import { Prisma } from "@prisma/client";
import { decryptCpf } from "../utils/cpfEncryption.js";
import { signContent } from "../utils/afSignature.js";

interface RetentionResult {
  descriptorsRemovidos: number;
  checkinsDeletados: number;
  tokensDeletados: number;
  duracaoMs: number;
  arquivosArquivados?: number;
}

function formatDateAfd(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function mapCheckinTypeToCode(type: string): string {
  const map: Record<string, string> = { ENTRY: "1", LUNCH_START: "2", LUNCH_END: "3", EXIT: "4" };
  return map[type] ?? "0";
}

function formatMinutesHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Executa a política de retenção e eliminação de dados.
 * Deve rodar diariamente via cron (02:00).
 *
 * Regras conforme POLITICA_RETENCAO.md:
 * - faceDescriptor de INACTIVE users há >30 dias → NULL
 * - CheckIns com >5 anos → ARQUIVAR (hash + AuditLog ARCHIVE) → DELETE (P0-4 mínimo)
 * - InviteTokens revogados há >90 dias → DELETE (cascade)
 *
 * P0-4: nenhum DELETE de CheckIn sem AuditLog ARCHIVE prévio com hashArquivo.
 */
export async function runRetentionCleanup(): Promise<RetentionResult> {
  const inicio = Date.now();
  const now = new Date();

  // 1. Remover descriptors de usuários desligados há mais de 30 dias
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const usersToClean = await prisma.user.findMany({
    where: {
      status: "INACTIVE",
      deactivatedAt: { lt: thirtyDaysAgo },
      faceDescriptor: { not: Prisma.DbNull },
    },
    select: { id: true },
  });

  let descriptorsRemovidos = 0;
  if (usersToClean.length > 0) {
    const result = await prisma.user.updateMany({
      where: { id: { in: usersToClean.map((u) => u.id) } },
      data: { faceDescriptor: Prisma.DbNull },
    });
    descriptorsRemovidos = result.count;
  }

  // 2. Arquivar e remover checkins com mais de 5 anos (P0-4 mínimo)
  // Port.671 Art.82 + LGPD Art.16: arquivar (hash + AuditLog) antes de deletar.
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  // Contar antes para decidir se precisa arquivar
  const countOld = await prisma.checkIn.count({ where: { createdAt: { lt: fiveYearsAgo } } });
  let arquivosArquivados = 0;
  let totalDeletados = 0;

  if (countOld > 0) {
    const companies = await prisma.company.findMany({ select: { id: true, cnpj: true, name: true } });

    for (const company of companies) {
      const checkins = await prisma.checkIn.findMany({
        where: { companyId: company.id, createdAt: { lt: fiveYearsAgo } },
        orderBy: [{ ano: "asc" }, { nsr: "asc" }],
        include: { user: { select: { cpf: true, name: true } } },
      });
      if (checkins.length === 0) continue;

      const users = await prisma.user.findMany({
        where: { companyId: company.id },
        select: {
          id: true,
          name: true,
          cpf: true,
          workSchedule: {
            select: { name: true, entryTime: true, lunchStart: true, lunchEnd: true, exitTime: true, daysOfWeek: true },
          },
        },
      });

      const cnpjClean = (company.cnpj ?? "").replace(/\D/g, "");
      const dataIni = formatDateAfd(new Date(fiveYearsAgo.getTime() - 365 * 24 * 60 * 60 * 1000));
      const dataFim = formatDateAfd(fiveYearsAgo);

      // Gerar conteúdo AFD+Aej para hash (reuso Afd/AejController)
      const lines: string[] = [];
      lines.push(["1", cnpjClean, "", company.name ?? "", dataIni, dataFim].join("|"));
      for (const emp of users) {
        if (!emp.workSchedule) continue;
        const cpf = (() => {
          try {
            return decryptCpf(emp.cpf ?? "").replace(/\D/g, "");
          } catch {
            return "";
          }
        })();
        const ws = emp.workSchedule;
        const horario = `${formatMinutesHHMM(ws.entryTime)}|${formatMinutesHHMM(ws.lunchStart)}|${formatMinutesHHMM(ws.lunchEnd)}|${formatMinutesHHMM(ws.exitTime)}`;
        lines.push(["2", cnpjClean, cpf, ws.name, horario, String(ws.daysOfWeek)].join("|"));
      }
      for (const ch of checkins) {
        const cpf = (() => {
          try {
            return decryptCpf(ch.user?.cpf ?? "").replace(/\D/g, "");
          } catch {
            return "";
          }
        })();
        const dataHora = formatDateAfd(ch.createdAt);
        const codigo = mapCheckinTypeToCode(ch.type);
        const nsrFmt = String(ch.nsr).padStart(6, "0");
        const cnpjEmpregador = (ch.employerCnpj ?? "").replace(/\D/g, "");
        lines.push(["3", cnpjEmpregador, cpf, nsrFmt, dataHora, codigo].join("|"));
      }
      lines.push(["9", cnpjClean, String(checkins.length).padStart(6, "0")].join("|"));
      const content = lines.join("\n");
      const { hash, assinado, assinatura, erro } = signContent(content);

      // AuditLog ARCHIVE imutável antes de deletar (P0-4 critério)
      try {
        await prisma.auditLog.create({
          data: {
            userId: "system",
            companyId: company.id,
            action: "ARCHIVE",
            entity: "CheckIn",
            entityId: `retention-${company.id}-${now.toISOString().split("T")[0]}`,
            newData: {
              hashArquivo: hash,
              assinado,
              assinatura: assinatura ?? null,
              erro: erro ?? null,
              periodo: { dataIni, dataFim, fiveYearsAgo: fiveYearsAgo.toISOString() },
              count: checkins.length,
              linhas: lines.length,
            } as unknown as Prisma.InputJsonValue,
            ip: null,
            userAgent: "retentionCleanup",
            legalBasis: "Art.16 LGPD + Art.82 Port.671 + CLT Art.74 §4º",
            purpose: "Arquivamento fiscal 5 anos antes de eliminação",
            personalDataCategories: ["PONTO", "IDENTIFICACAO"],
          },
        });
        arquivosArquivados++;
      } catch (e) {
        console.error(`[RETENTION] Falha ao criar AuditLog ARCHIVE para ${company.id}:`, e);
        // Não deletar se arquivamento falhar — garante inviolabilidade
        continue;
      }

      // Deleta apenas desta empresa após arquivamento bem-sucedido
      const del = await prisma.checkIn.deleteMany({
        where: { companyId: company.id, createdAt: { lt: fiveYearsAgo } },
      });
      totalDeletados += del.count;
    }
  }

  const deletedCheckins = { count: totalDeletados } as { count: number };

  if (countOld > 0 && arquivosArquivados === 0) {
    console.warn("[RETENTION] Nenhum arquivo arquivado mas checkins antigos existiam — nenhum delete realizado (inviolabilidade)");
    deletedCheckins.count = 0;
  }

  // 3. Remover tokens de convite revogados há mais de 90 dias
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const deletedTokens = await prisma.inviteToken.deleteMany({
    where: {
      revokedAt: { lt: ninetyDaysAgo },
    },
  });

  const duracaoMs = Date.now() - inicio;

  console.log(
    JSON.stringify({
      event: "RETENTION_CLEANUP",
      date: now.toISOString(),
      descriptorsRemovidos,
      checkinsDeletados: deletedCheckins.count,
      tokensDeletados: deletedTokens.count,
      duracaoMs,
    })
  );

  return {
    descriptorsRemovidos,
    checkinsDeletados: deletedCheckins.count,
    tokensDeletados: deletedTokens.count,
    duracaoMs,
  };
}

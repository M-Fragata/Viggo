import { prisma } from "../database/prisma.js";
import { Prisma } from "@prisma/client";

interface RetentionResult {
  descriptorsRemovidos: number;
  checkinsDeletados: number;
  tokensDeletados: number;
  duracaoMs: number;
}

/**
 * Executa a política de retenção e eliminação de dados.
 * Deve rodar diariamente via cron (02:00).
 *
 * Regras conforme POLITICA_RETENCAO.md:
 * - faceDescriptor de INACTIVE users há >30 dias → NULL
 * - CheckIns com >5 anos → DELETE
 * - InviteTokens revogados há >90 dias → DELETE (cascade)
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

  // 2. Remover checkins com mais de 5 anos
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const deletedCheckins = await prisma.checkIn.deleteMany({
    where: { createdAt: { lt: fiveYearsAgo } },
  });

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

import { prisma } from "../database/prisma.js";

const NSR_MAX = 999_999;

/**
 * Gera o proximo NSR (Numero Sequencial de Registro) para a empresa,
 * reiniciando a cada 1 de Janeiro (Limite 999.999 por ano).
 *
 * Portaria 671/2021:
 * - Art. 78 §5º III - NSR sequencial por estabelecimento, ininterrupto
 * - Art. 78 §5º-C - reinicia a cada 1o de janeiro
 *
 * A constraint @@unique([companyId, nsr, ano]) garante que nunca
 * dois checkins do mesmo ano recebam o mesmo NSR. Em race conditions
 * raras, a constraint falha e lancamos erro para o chamador
 * re-tentar.
 *
 * Recomenda-se chamar dentro de prisma.$transaction para garantir
 * atomicidade entre a geracao do NSR e o create do CheckIn.
 */
export async function getNextNSR(
  companyId: string,
  year: number = new Date().getFullYear()
): Promise<number> {
  const lastCheckin = await prisma.checkIn.findFirst({
    where: {
      companyId,
      ano: year,
    },
    orderBy: { nsr: "desc" },
    select: { nsr: true },
  });

  const nextNSR = (lastCheckin?.nsr ?? 0) + 1;

  if (nextNSR > NSR_MAX) {
    throw new NsrLimitExceededError(
      `Limite de ${NSR_MAX} NSR atingido no ano ${year} para a empresa ${companyId}.`
    );
  }

  return nextNSR;
}

/**
 * Retorna o ano corrente (conveniencia).
 */
export function currentYear(): number {
  return new Date().getFullYear();
}

export class NsrLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NsrLimitExceededError";
  }
}

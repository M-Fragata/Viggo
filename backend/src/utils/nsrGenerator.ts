import { prisma } from "../database/prisma.js";

const NSR_MAX = 999_999;

type CheckInDelegate = {
  findFirst: (args: unknown) => Promise<{ nsr: number } | null>;
};

/**
 * Cliente mínimo para geração de NSR (PrismaClient ou TransactionClient).
 * Aceita qualquer objeto com `checkIn.findFirst`.
 */
type NsrClient = { checkIn: CheckInDelegate };

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
 * Para isolamento correto, passe o `tx` da transação como primeiro argumento
 * (P0-5 compliance fix): `getNextNSR(tx, companyId, ano)`.
 * A forma legada `getNextNSR(companyId, ano)` permanece suportada via `prisma` global
 * para compatibilidade com testes unitários.
 *
 * @param clientOrCompanyId - TransactionClient OU companyId (overload legado)
 * @param companyIdOrYear - companyId quando primeiro arg é client, OU year quando primeiro arg é companyId
 * @param maybeYear - year quando primeiro arg é client
 */
export async function getNextNSR(
  clientOrCompanyId: string | NsrClient,
  companyIdOrYear?: string | number,
  maybeYear?: number
): Promise<number> {
  let client: NsrClient;
  let companyId: string;
  let year: number;

  if (typeof clientOrCompanyId === "string") {
    // Forma legada: getNextNSR(companyId, year?)
    client = prisma as unknown as NsrClient;
    companyId = clientOrCompanyId;
    year = typeof companyIdOrYear === "number" ? companyIdOrYear : new Date().getFullYear();
  } else {
    // Forma transacional: getNextNSR(tx, companyId, year?)
    client = clientOrCompanyId;
    companyId = companyIdOrYear as string;
    year = typeof maybeYear === "number" ? maybeYear : new Date().getFullYear();
  }

  const lastCheckin = await client.checkIn.findFirst({
    where: {
      companyId,
      ano: year,
    },
    orderBy: { nsr: "desc" },
    select: { nsr: true },
  } as unknown as never);

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

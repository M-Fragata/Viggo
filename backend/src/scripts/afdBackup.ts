import { prisma } from "../database/prisma.js";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { decryptCpf } from "../utils/cpfEncryption.js";
import { signContent } from "../utils/afSignature.js";
import { encryptBackup, saveBackup, backupExists } from "../utils/backupStorage.js";
import { Env } from "../utils/environment.js";

function formatDateAfd(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function mapType(code: string): string {
  const m: Record<string, string> = { ENTRY: "1", LUNCH_START: "2", LUNCH_END: "3", EXIT: "4" };
  return m[code] ?? "0";
}

interface BackupResult {
  companyId: string;
  cnpj: string;
  period: string;
  key: string;
  bytes: number;
  hash: string;
  assinado: boolean;
  skipped?: boolean;
  error?: string;
}

function getMonthBounds(year: number, month: number): { start: Date; end: Date; period: string } {
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59);
  const period = `${year}-${String(month).padStart(2, "0")}`;
  return { start, end, period };
}

/**
 * Gera AFD de um mês para uma empresa (reuso AfdController, sem HTTP).
 */
async function buildAfdForCompany(companyId: string, cnpj: string, companyName: string, start: Date, end: Date): Promise<{ content: string; count: number }> {
  const checkins = await extendedPrisma.checkIn.findMany({
    where: { companyId, createdAt: { gte: start, lte: end } },
    orderBy: [{ ano: "asc" }, { nsr: "asc" }],
    include: { user: { select: { cpf: true } } },
  });

  const cnpjClean = cnpj.replace(/\D/g, "");
  const lines: string[] = [];
  lines.push(["1", cnpjClean, "", companyName, formatDateAfd(start), formatDateAfd(end)].join("|"));
  for (const ch of checkins) {
    const cpf = (() => {
      try {
        return decryptCpf(ch.user?.cpf ?? "").replace(/\D/g, "");
      } catch {
        return "";
      }
    })();
    const nsrFmt = String(ch.nsr).padStart(6, "0");
    const cnpjEmpregador = (ch.employerCnpj ?? cnpj).replace(/\D/g, "");
    lines.push(["2", cnpjEmpregador, cpf, nsrFmt, formatDateAfd(ch.createdAt), mapType(ch.type)].join("|"));
  }
  lines.push(["9", cnpjClean, String(checkins.length).padStart(6, "0")].join("|"));
  return { content: lines.join("\n"), count: checkins.length };
}

/**
 * B2 — Modelo A: backup mensal versionado, local criptografado.
 * Chamado via cron dia 01 03:00 para mês anterior, ou CLI --year --month --companyId.
 */
export async function runAfdBackup(opts?: { year?: number; month?: number; companyId?: string; force?: boolean }): Promise<BackupResult[]> {
  if (!Env.AFD_BACKUP_KEY) {
    console.warn("[BACKUP] AFD_BACKUP_KEY não configurado — backup ignorado. Gere com: openssl rand -hex 32");
    return [];
  }

  const now = new Date();
  const year = opts?.year ?? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const month = opts?.month ?? (now.getMonth() === 0 ? 12 : now.getMonth());
  const { start, end, period } = getMonthBounds(year, month);

  const companies = opts?.companyId
    ? await prisma.company.findMany({ where: { id: opts.companyId }, select: { id: true, cnpj: true, name: true } })
    : await prisma.company.findMany({ select: { id: true, cnpj: true, name: true } });

  const results: BackupResult[] = [];

  for (const company of companies) {
    const cnpj = company.cnpj ?? "";
    const key = `${company.id}/afd/${period}.txt.enc`;

    if (!opts?.force && backupExists(key)) {
      results.push({ companyId: company.id, cnpj, period, key, bytes: 0, hash: "", assinado: false, skipped: true });
      continue;
    }

    try {
      const { content, count } = await buildAfdForCompany(company.id, cnpj, company.name ?? "", start, end);
      const { hash, assinado, assinatura, erro } = signContent(content);
      const payload = content + `\nHASH: ${hash}` + (assinado && assinatura ? `\nSIGNATURE: ${assinatura}` : "");
      const encrypted = encryptBackup(payload);
      const meta = saveBackup(key, encrypted);

      // AuditLog BACKUP imutável (Art.81)
      try {
        await prisma.auditLog.create({
          data: {
            userId: "system",
            companyId: company.id,
            action: "BACKUP",
            entity: "AfdBackup",
            entityId: `${company.id}-${period}`,
            newData: {
              period,
              key,
              hash,
              assinado,
              bytes: meta.bytes,
              count,
              localPath: meta.localPath,
              erro: erro ?? null,
            } as unknown as import("@prisma/client").Prisma.InputJsonValue,
            legalBasis: "Art.81 Port.671 + Art.37 LGPD",
            purpose: "Backup mensal AFD criptografado (Modelo A)",
            personalDataCategories: ["PONTO", "IDENTIFICACAO"],
          },
        });
      } catch (e) {
        console.error(`[BACKUP] Falha AuditLog BACKUP ${company.id} ${period}:`, e);
      }

      results.push({ companyId: company.id, cnpj, period, key, bytes: meta.bytes, hash, assinado });
      console.log(`[BACKUP] OK ${company.id} ${period} count=${count} hash=${hash.slice(0, 8)} assinado=${assinado} bytes=${meta.bytes}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[BACKUP] ERRO ${company.id} ${period}:`, msg);
      results.push({ companyId: company.id, cnpj, period, key, bytes: 0, hash: "", assinado: false, error: msg });
    }
  }

  console.log(JSON.stringify({ event: "AFD_BACKUP", period, companies: results.length, skipped: results.filter((r) => r.skipped).length }));
  return results;
}

// CLI: npm run backup:afd -- --year 2026 --month 8 --companyId xxx --force
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const yearStr = get("year");
  const monthStr = get("month");
  const companyId = get("companyId");
  const force = args.includes("--force");
  const opts: { year?: number; month?: number; companyId?: string; force?: boolean } = {};
  if (yearStr) opts.year = Number(yearStr);
  if (monthStr) opts.month = Number(monthStr);
  if (companyId) opts.companyId = companyId;
  if (force) opts.force = true;
  runAfdBackup(opts)
    .then((r) => {
      console.log("Backup concluído:", r);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

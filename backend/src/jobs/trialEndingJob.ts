import { prisma } from "../database/prisma.js";
import * as emailService from "../services/email/emailService.js";
import { Env } from "../utils/environment.js";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function runTrialEndingJob(): Promise<{ sent3d: number; sent1d: number; errors: string[] }> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const target3d = addDays(todayStart, 3);
  const target1d = addDays(todayStart, 1);

  const masterCnpj = Env.MASTER_CNPJ?.replace(/\D/g, "");
  const companies = await prisma.company.findMany({
    where: {
      status: "TRIAL",
      planExpiresAt: { not: null },
      ...(masterCnpj ? { cnpj: { not: masterCnpj } } : {}),
    },
    select: { id: true, name: true, cnpj: true, planExpiresAt: true },
  });

  let sent3d = 0;
  let sent1d = 0;
  const errors: string[] = [];

  for (const company of companies) {
    if (masterCnpj && company.cnpj?.replace(/\D/g, "") === masterCnpj) continue;
    if (!company.planExpiresAt) continue;
    const expiresDay = startOfDay(company.planExpiresAt);
    let daysRemaining: 3 | 1 | null = null;
    if (isSameDay(expiresDay, target3d)) daysRemaining = 3;
    else if (isSameDay(expiresDay, target1d)) daysRemaining = 1;
    else continue;

    try {
      const admins = await prisma.user.findMany({
        where: { companyId: company.id, role: "ENTERPRISE_ADMIN" },
        select: { email: true },
      });
      if (admins.length === 0) continue;

      await emailService.sendTrialEnding({
        to: admins.map((a) => a.email),
        companyName: company.name,
        daysRemaining,
        planExpiresAt: company.planExpiresAt,
      });

      if (daysRemaining === 3) sent3d++;
      else sent1d++;
    } catch (err) {
      const msg = `Company ${company.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error("[trialEndingJob]", msg);
      errors.push(msg);
    }
  }

  console.log(`[trialEndingJob] Concluído: 3d=${sent3d} 1d=${sent1d} errors=${errors.length}`);
  return { sent3d, sent1d, errors };
}

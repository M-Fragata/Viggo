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

export async function runPaymentUpcomingJob(): Promise<{ sent3d: number; sent1d: number; errors: string[] }> {
  const todayStart = startOfDay(new Date());
  const target3d = addDays(todayStart, 3);
  const target1d = addDays(todayStart, 1);

  // Buscar payments pendentes com dueDate em D+3 ou D+1 (exclui master)
  const payments = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      dueDate: { gte: todayStart },
      ...(Env.MASTER_CNPJ?.replace(/\D/g, "") ? { company: { cnpj: { not: Env.MASTER_CNPJ!.replace(/\D/g, "") } } } : {}),
    },
    select: { id: true, companyId: true, amount: true, dueDate: true },
  });

  let sent3d = 0;
  let sent1d = 0;
  const errors: string[] = [];

  for (const payment of payments) {
    const dueDay = startOfDay(payment.dueDate);
    let daysRemaining: 3 | 1 | null = null;
    if (isSameDay(dueDay, target3d)) daysRemaining = 3;
    else if (isSameDay(dueDay, target1d)) daysRemaining = 1;
    else continue;

    try {
      const company = await prisma.company.findUnique({ where: { id: payment.companyId }, select: { cnpj: true, name: true } });
      const masterCnpj = Env.MASTER_CNPJ?.replace(/\D/g, "");
      if (masterCnpj && company?.cnpj?.replace(/\D/g, "") === masterCnpj) continue;
      const admins = await prisma.user.findMany({ where: { companyId: payment.companyId, role: "ENTERPRISE_ADMIN" }, select: { email: true } });
      if (admins.length === 0) continue;
      await emailService.sendPaymentUpcoming({
        to: admins.map((a) => a.email),
        companyName: company?.name ?? "Sua empresa",
        amount: Number(payment.amount),
        dueDate: payment.dueDate,
        daysRemaining,
      });
      if (daysRemaining === 3) sent3d++;
      else sent1d++;
    } catch (err) {
      const msg = `Payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error("[paymentUpcomingJob]", msg);
      errors.push(msg);
    }
  }

  console.log(`[paymentUpcomingJob] Concluído: 3d=${sent3d} 1d=${sent1d} errors=${errors.length}`);
  return { sent3d, sent1d, errors };
}

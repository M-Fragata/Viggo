import { prisma } from "../database/prisma.js";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { Prisma } from "@prisma/client";
import * as emailService from "../services/email/emailService.js";
import { getBiometricExpiryInfo } from "../utils/biometricRevalidation.js";

export async function runBiometricExpiringJob(): Promise<{ sent: number; errors: string[] }> {
  // Janela: 23 meses atrás — quem fez biometria há 23 meses expira em ~30 dias (24 meses total)
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 23);

  const users = await extendedPrisma.user.findMany({
    where: {
      status: "ACTIVE",
      faceDescriptor: { not: Prisma.DbNull },
      faceDescriptorUpdatedAt: { lt: cutoffDate },
      faceRevalidationNotifiedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      faceDescriptorUpdatedAt: true,
    },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    // Double-check expiry info
    const info = getBiometricExpiryInfo(user.faceDescriptorUpdatedAt);
    if (!info.expiresAt || info.isExpired) continue;
    // Só envia se está entre 25-35 dias do vencimento (aprox 30d)
    if (info.daysUntilExpiry === null || info.daysUntilExpiry > 35 || info.daysUntilExpiry < 20) continue;

    try {
      await emailService.sendBiometricExpiring({
        to: user.email,
        userName: user.name,
        expiresAt: info.expiresAt,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { faceRevalidationNotifiedAt: new Date() },
      });

      sent++;
    } catch (err) {
      const msg = `User ${user.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error("[biometricExpiringJob]", msg);
      errors.push(msg);
    }
  }

  console.log(`[biometricExpiringJob] Concluído: sent=${sent} errors=${errors.length} (candidatos=${users.length})`);
  return { sent, errors };
}

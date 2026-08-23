import { Prisma } from "@prisma/client";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { prisma } from "../database/prisma.js";

const BIOMETRIC_REVALIDATION_MONTHS = 24;

export async function findUsersNeedingBiometricRevalidation() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - BIOMETRIC_REVALIDATION_MONTHS);

  return extendedPrisma.user.findMany({
    where: {
      status: "ACTIVE",
      faceDescriptor: { not: Prisma.DbNull },
      faceDescriptorUpdatedAt: { lt: cutoffDate },
    },
    select: {
      id: true,
      name: true,
      email: true,
      companyId: true,
      faceDescriptorUpdatedAt: true,
    },
  });
}

export async function purgeExpiredBiometricDescriptors(): Promise<{
  purged: number;
  errors: string[];
}> {
  const users = await findUsersNeedingBiometricRevalidation();
  const errors: string[] = [];
  let purged = 0;

  for (const user of users) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            faceDescriptor: Prisma.DbNull,
            faceDescriptorUpdatedAt: null,
            faceRevalidationNotifiedAt: new Date(),
          },
        });

        await tx.consentimento.upsert({
          where: {
            userId_tipo_versao: {
              userId: user.id,
              tipo: "BIOMETRIA",
              versao: "1.0",
            },
          },
          update: { aceite: false },
          create: {
            userId: user.id,
            tipo: "BIOMETRIA",
            versao: "1.0",
            aceite: false,
          },
        });

        purged++;
      });

      // E-mail purged (fire-and-forget)
      try {
        const { sendBiometricPurged } = await import("../services/email/emailService.js");
        await sendBiometricPurged({ to: user.email, userName: user.name });
      } catch (e) {
        console.error(`[Email] biometric-purged failed for ${user.id}:`, e);
      }
    } catch (error) {
      errors.push(`User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { purged, errors };
}

export async function notifyUsersBiometricExpiring(): Promise<{
  notified: number;
  errors: string[];
}> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - BIOMETRIC_REVALIDATION_MONTHS + 1);

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
      companyId: true,
    },
  });

  const errors: string[] = [];
  let notified = 0;

  for (const user of users) {
    try {
      await extendedPrisma.user.update({
        where: { id: user.id },
        data: { faceRevalidationNotifiedAt: new Date() },
      });
      notified++;
    } catch (error) {
      errors.push(`User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { notified, errors };
}

export function getBiometricRevalidationPolicy(): {
  months: number;
  description: string;
} {
  return {
    months: BIOMETRIC_REVALIDATION_MONTHS,
    description: `Biometric descriptors expire after ${BIOMETRIC_REVALIDATION_MONTHS} months (${BIOMETRIC_REVALIDATION_MONTHS / 12} years). Active users with expired descriptors will have their biometric data purged and consent revoked per LGPD Art. 15 retention policy.`,
  };
}

export async function notifyBiometricRevalidationPending(userId: string): Promise<void> {
  await extendedPrisma.user.update({
    where: { id: userId },
    data: { faceRevalidationNotifiedAt: new Date() },
  });
}

export function isBiometricExpired(faceDescriptorUpdatedAt: Date | null): boolean {
  if (!faceDescriptorUpdatedAt) return true;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - BIOMETRIC_REVALIDATION_MONTHS);
  return faceDescriptorUpdatedAt < cutoffDate;
}

export function getBiometricExpiryInfo(faceDescriptorUpdatedAt: Date | null): {
  isExpired: boolean;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
} {
  if (!faceDescriptorUpdatedAt) {
    return { isExpired: true, expiresAt: null, daysUntilExpiry: null };
  }

  const expiresAt = new Date(faceDescriptorUpdatedAt);
  expiresAt.setMonth(expiresAt.getMonth() + BIOMETRIC_REVALIDATION_MONTHS);

  const now = new Date();
  const isExpired = expiresAt <= now;

  const diffTime = expiresAt.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { isExpired, expiresAt, daysUntilExpiry: Math.max(0, daysUntilExpiry) };
}

export const BIOMETRIC_REVALIDATION_MONTHS_CONST = BIOMETRIC_REVALIDATION_MONTHS;
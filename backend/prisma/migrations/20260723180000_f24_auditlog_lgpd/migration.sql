-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "legalBasis" TEXT,
ADD COLUMN "purpose" TEXT,
ADD COLUMN "personalDataCategories" JSONB;

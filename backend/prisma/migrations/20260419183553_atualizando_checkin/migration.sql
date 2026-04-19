/*
  Warnings:

  - You are about to drop the column `timestamp` on the `CheckIn` table. All the data in the column will be lost.
  - Added the required column `type` to the `CheckIn` table without a default value. This is not possible if the table is not empty.
  - Made the column `latitude` on table `CheckIn` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `CheckIn` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CheckInType" AS ENUM ('ENTRY', 'LUNCH_START', 'LUNCH_END', 'EXIT');

-- AlterTable
ALTER TABLE "CheckIn" DROP COLUMN "timestamp",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" "CheckInType" NOT NULL,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;

-- CreateTable
CREATE TABLE "Consentimento" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "aceite" BOOLEAN NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consentimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consentimento_userId_tipo_versao_key" ON "Consentimento"("userId", "tipo", "versao");

-- CreateIndex
CREATE INDEX "Consentimento_userId_idx" ON "Consentimento"("userId");

-- AddForeignKey
ALTER TABLE "Consentimento" ADD CONSTRAINT "Consentimento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

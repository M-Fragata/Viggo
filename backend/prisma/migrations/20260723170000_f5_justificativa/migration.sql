-- CreateTable
CREATE TABLE "Justificativa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "comprovante" TEXT,
    "aprovado" BOOLEAN,
    "aprovadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Justificativa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Justificativa_userId_dataInicio_idx" ON "Justificativa"("userId", "dataInicio");

-- CreateIndex
CREATE INDEX "Justificativa_companyId_dataInicio_idx" ON "Justificativa"("companyId", "dataInicio");

-- AddForeignKey
ALTER TABLE "Justificativa" ADD CONSTRAINT "Justificativa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Justificativa" ADD CONSTRAINT "Justificativa_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

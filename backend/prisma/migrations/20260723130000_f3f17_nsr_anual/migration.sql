-- F3+F17: Adicionar campos NSR (Numero Sequencial de Registro) e ano ao CheckIn
-- conforme Portaria 671/2021 Art. 78 §5º III e §5º-C (reinicio anual, limite 999.999)

-- AlterTable: adicionar colunas nsr (Int) e ano (Int com default = ano corrente)
ALTER TABLE "CheckIn" ADD COLUMN "nsr" INTEGER;
ALTER TABLE "CheckIn" ADD COLUMN "ano" INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP);

-- Para registros existentes (se houver): preenche nsr sequencialmente e ano com base em createdAt
-- NOTA: banco dev previamente resetado, portanto tabela deve estar vazia.
-- Em caso de dados existentes, executar script de populacao antes de SET NOT NULL.

-- Tornar NOT NULL apos garantir que todos os registros tenham valor
ALTER TABLE "CheckIn" ALTER COLUMN "nsr" SET NOT NULL;
ALTER TABLE "CheckIn" ALTER COLUMN "ano" SET NOT NULL;

-- CreateIndex: constraint unica (companyId, nsr, ano) - permite reinicio anual do NSR
CREATE UNIQUE INDEX "CheckIn_companyId_nsr_ano_key" ON "CheckIn"("companyId", "nsr", "ano");

-- CreateIndex: indice composto para consulta rapida por empresa+ano+nsr
CREATE INDEX "CheckIn_companyId_nsr_ano_idx" ON "CheckIn"("companyId", "nsr", "ano");

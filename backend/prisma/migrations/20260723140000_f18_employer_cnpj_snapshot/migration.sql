-- F18: Snapshot do CNPJ do empregador no CheckIn (desnormalizacao)
-- Portaria 671/2021 Art. 78 §5o-A II - identificacao do empregador (CNPJ) materializada no registro
-- Protege contra alteracao futura do CNPJ da empresa (incorporacao/cisao)

-- AlterTable: adicionar coluna employerCnpj (NOT NULL)
-- Tabela dev vazia, pode adicionar NOT NULL direto.
ALTER TABLE "CheckIn" ADD COLUMN "employerCnpj" TEXT NOT NULL;

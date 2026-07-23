-- AlterTable: Tornar coluna "cnpj" NOT NULL (obrigatorio) no modelo Company
-- Antes: String? (nullable), agora: String (NOT NULL)
-- conforme Portaria 671/2021 Art. 78, §5º, II (F4)
-- Nota: assume que não existem registros com cnpj NULL em producao (dados previamente resetados em dev)

ALTER TABLE "Company" ALTER COLUMN "cnpj" SET NOT NULL;

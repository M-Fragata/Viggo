-- F4: Adicionar coluna cnpj (CNPJ do empregador) e tornar obrigatória
-- conforme Portaria 671/2021 Art. 78, §5º, II

-- Step 1: Adicionar coluna cnpj (nullable inicialmente)
ALTER TABLE "Company" ADD COLUMN "cnpj" TEXT;

-- Step 2: Tornar NOT NULL (seguro pois banco dev está vazio após reset)
ALTER TABLE "Company" ALTER COLUMN "cnpj" SET NOT NULL;

-- Unique constraint
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

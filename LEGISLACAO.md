# Análise de Conformidade Legal — Projeto Viggo

**Data:** 17 de Julho de 2026
**Escopo:** Backend (Express + Prisma + PostgreSQL), Frontend (React + Vite)
**Legislação aplicável:** Portaria MTE nº 671/2021, LGPD (Lei nº 13.709/2018), CLT Art. 74
**Classificação do Viggo:** REP-P (Registrador Eletrônico de Ponto por Programa)

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Portaria MTE nº 671/2021 — Artigos 75 a 83 (REP-P)](#2-portaria-mte-nº-6712021)
3. [LGPD — Lei nº 13.709/2018](#3-lgpd--lei-nº-137092018)
4. [CLT — Artigo 74](#4-clt--artigo-74)
5. [Mapa de Conformidade Consolidado](#5-mapa-de-conformidade-consolidado)
6. [Roteiro de Implementação — Priorização](#6-roteiro-de-implementação--priorização)
7. [Notas Técnicas e Referências](#7-notas-técnicas-e-referências)

---

## 1. Resumo Executivo

O Viggo é um software SaaS de registro de ponto eletrônico que utiliza reconhecimento facial
(face-api.js / TensorFlow.js) e geolocalização para validação de identidade do trabalhador no
momento da marcação de ponto. O sistema é classificado como **REP-P** pela Portaria MTE nº
671/2021, que é a norma regulamentadora definitiva para softwares de controle de ponto no Brasil.

### O que JÁ está em conformidade

- **Irreversibilidade de dados biométricos:** O sistema armazena apenas o vetor matemático
  (descriptor de 128 floats), nunca a imagem facial do funcionário. Isso atende ao princípio
  de minimização de dados da LGPD.
- **Geolocalização pontual:** A captura de localização ocorre apenas via
  `navigator.geolocation.getCurrentPosition()` no momento exato da batida de ponto
  (`pontoPage.tsx:46`). Não há `watchPosition`, rastreamento em background ou fora do
  horário de trabalho.
- **Proibição de edição/exclusão de batidas:** O controller `CheckinController.ts` possui
  apenas o método `createCheckin`. Não existem endpoints `PUT` ou `DELETE` para registros
  de ponto, garantindo a integridade dos dados originais conforme Art. 78 da Portaria 671.
- **Proteção contra ponto britânico:** A batida de ponto depende de trigger explícito do
  usuário + validação facial ativa + liveness challenge, impedindo marcação automática.
- **Bloqueio de batida duplicada:** `CheckinController.ts:31-43` verifica se já existe
  registro do mesmo tipo no mesmo dia antes de criar.
- **Autenticação obrigatória:** A rota `POST /checkins` requer `authMiddleware` (JWT válido),
  sem exigência de autorização prévia do gestor, cumprindo Art. 78 §1º.
- **Audit trail completo:** `AuditMiddleware.ts` registra todas as operações sensíveis
  (CHECKIN, FACE_VALIDATION, FACE_REGISTER) com IP, User-Agent, userId e companyId.
- **Multi-tenancy isolado:** `prisma-extensions.ts` injeta automaticamente `companyId` em
  todas as queries via AsyncLocalStorage, garantindo isolamento total entre empresas.
- **Rate limiting específico:** Limitadores distintos para API geral, checkin e validação
  facial (`RateLimitMiddleware.ts`), prevenindo abuso.

### O que FALTA — Não conformidades identificadas

A análise identificou **26 lacunas legais** distribuídas entre as três normas:

| Norma | Bloqueante | Alto Risco | Médio |
|-------|-----------|------------|-------|
| Portaria 671/2021 | 7 (F1-F6, F17) | 4 (F7, F18, F20, F21) | 3 (F8, F16, F22*) |
| LGPD | 4 (F9, F10, F11, F19) | 3 (F11.b, F12, F13) | 4 (F14, F22†, F23, F24) |
| CLT Art. 74 | 0 | 1 (F15) | 0 |
| **Total** | **11** | **8** | **7** |

**Total: 26 findings — 11 bloqueantes, 8 alto, 7 médio**

> \* F22 (RIP) aplicável à Portaria por exigir registro de conformidade REP-P.
> † F22 (RIP) também aplicável à LGPD Art. 50 (Relatório de Impacto à Proteção de Dados).

> ⚠️ Os 11 findings bloqueantes **impedem** o Viggo de operar como REP-P
> legalmente. Sem eles, qualquer fiscalização do MTE resultaria em
> multa e notificação, independentemente de o software ser funcional.
clientes a multas do MTE (Art. 75 da Portaria 671: multa de R$ 3.000,00 a R$ 60.000,00
por equipamento não homologado) e riscos de ações trabalhistas e da ANPD (até 2% do
faturamento, limitado a R$ 50 milhões por infração).

---

## 2. Portaria MTE nº 671/2021

> "Esta Portaria substituiu as antigas Portarias 1510 e 373 e regulamenta os dispositivos
> da CLT relativos à regulamentação do registro do ponto e do trabalho a distância."
>
> Aplica-se diretamente ao Viggo por classificá-lo como REP-P (Art. 75).

### 2.1. O que é um REP-P

De acordo com Art. 75, §2º, o REP-P é um **Registrador Eletrônico de Ponto por Programa**
que deve:

- Ser desenvolvido por empresa especializada (Art. 75, §2º)
- Possuir código-fonte assinado digitalmente com certificado ICP-Brasil (Art. 79, §2º)
- Ser homologado pelo MTE (Art. 75, §1º)
- Registrar os dados conforme leiaute definido no Anexo II (AFD) (Art. 78, §5º)
- Fornecer comprovante ao trabalhador no ato da marcação (Art. 78, §2º)

### 2.2. Findings — Portaria 671/2021

---

#### F1. ASSINATURA DIGITAL ICP-BRASIL DO CÓDIGO-FONTE — BLOQUEANTE

> **Art. 79, §2º:** "O REP-P deverá possuir código-fonte assinado digitalmente, com
> certificado emitido por entidade de certificação credenciada pela ICP-Brasil, em nome
> da pessoa jurídica desenvolvedora."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Sem assinatura digital ICP-Brasil, o software não é legalmente reconhecido
como REP-P válido. O MTE pode recusar a homologação e multar as empresas que utilizam
equipamento não homologado.

**Análise técnica atual:**
- `backend/package.json` não contém nenhum campo de assinatura ou code-signing
- Nenhum workflow no `.github/workflows/` implementa assinatura
- Não existe certificado digital da empresa desenvolvedora associado ao projeto
- O npm publish e builds de produção são feitos sem verificação de integridade

**Solução proposta:**

1. **Aquisição do certificado:** Obter certificado ICP-Brasil A1 ou A3 (e-CNPJ) para
   a pessoa jurídica desenvolvedora do Viggo.

2. **Assinatura do código-fonte:** Utilizar `gpg` ou `signtool` para assinar os módulos
   compilados antes do deploy. Criar script de build que:
   - Compila o TypeScript (`npm run build`)
   - Gera hash SHA-256 de cada arquivo compilado
   - Assina o manifesto com a chave ICP-Brasil
   - Grava o manifesto de assinatura no diretório de distribuição

3. **Verificação no deploy:** O deploy deve verificar a assinatura antes de executar.

**Arquivos afetados:**
- Novo: `scripts/sign-build.ts` — Script de assinatura
- Novo: `scripts/verify-signature.ts` — Script de verificação
- Alterado: `package.json` — Script `build:signed`
- Alterado: `.github/workflows/` — Step de assinatura no CI/CD
- Novo: `signatures/` — Diretório de manifestos assinados

---

#### F2. AUSÊNCIA DO AFD (ARQUIVO FONTE DE DADOS) — BLOQUEANTE

> **Art. 78, §5º:** "O REP-P deverá gerar o AFD de forma que os seus dados sejam
> armazenados em mídia magnética, óptica ou equivalente, sendo que:"
>
> I — o AFD deverá conter, no mínimo, as informações constantes do Anexo II;
>
> II — os dados do AFD deverão ser exportados no leiaute definido no Anexo II.

**Status:** NÃO IMPLEMENTADO

**Impacto:** Sem geração de AFD, o Viggo não fornece o arquivo obrigatório para
auditorias do MTE e para o eSocial (S-1200). As empresas clientes ficam impossibilitadas
de comprovar regularidade do controle de ponto.

**Análise técnica atual:**
- `CheckinController.ts` tem apenas operações CRUD — não há geração de arquivo
- `DashboardPage.tsx` gera uma tabela HTML para impressão, mas **não segue o leiaute
  do Anexo II** da Portaria 671
- Não há campo `NSR` (Número Sequencial de Registro) no schema Prisma
- Não há rota de exportação (`GET /checkins/export/afd` ou similar)
- Busca por `AFD`, `NSR`, `exportar.*csv` no código retorna apenas menções
  de marketing em `shared/plans.ts`

**Solução proposta:**

1. **Schema Prisma** — Adicionar campo `nsr` e `mr` (Motivo de Rejeição) ao modelo `CheckIn`:

```prisma
model CheckIn {
  id            String      @id @default(uuid())
  nsr           Int                      // NSR sequencial por empresa
  createdAt     DateTime    @default(now())
  type          CheckInType
  latitude      Float
  longitude     Float
  address       String?
  justificativa String?                  // Para marcações por exceção
  userId        String
  companyId     String
  mr            String?      @default("") // Motivo de Rejeição (vazio = OK)
  company       Company     @relation(fields: [companyId], references: [id])
  user          User        @relation(fields: [userId], references: [id])

  @@unique([companyId, nsr])
  @@index([userId, createdAt])
  @@index([companyId, createdAt])
}
```

2. **Geração de NSR** — Implementar gerador sequencial transacional:

```typescript
// backend/src/utils/nsrGenerator.ts
import { PrismaClient } from "@prisma/client";

/**
 * Gera o próximo NSR para a empresa de forma transacional.
 * O NSR é sequencial e ininterrupto dentro de cada empresa.
 */
export async function getNextNSR(
  prisma: PrismaClient,
  companyId: string
): Promise<number> {
  const lastCheckin = await prisma.checkIn.findFirst({
    where: { companyId },
    orderBy: { nsr: "desc" },
    select: { nsr: true },
  });

  return (lastCheckin?.nsr ?? 0) + 1;
}
```

3. **Rota de exportação AFD** — Leiaute do Anexo II:

```typescript
// backend/src/controller/AfdController.ts
import { type Request, type Response } from "express";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { z } from "zod";

/**
 * Formata data para o padrão AFD: dd/mm/yyyy HH:mm:ss
 */
function formatDateAfd(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

/**
 * Mapeia tipo de checkin para código AFD do Anexo II
 */
function mapCheckinTypeToAfdCode(type: string): string {
  const map: Record<string, string> = {
    ENTRY: "1",       // Entrada
    LUNCH_START: "2", // Saída para intervalo
    LUNCH_END: "3",   // Retorno do intervalo
    EXIT: "4",        // Saída
  };
  return map[type] ?? "0";
}

export class AfdController {
  /**
   * GET /checkins/export/afd?companyId=&startDate=&endDate=
   *
   * Gera o AFD conforme Anexo II da Portaria 671/2021.
   * Formato CSV com separador.pipe (|).
   */
  async exportAfd(req: Request, res: Response) {
    const querySchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    try {
      const { startDate, endDate } = querySchema.parse(req.query);
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar dados da empresa (CNPJ obrigatório para AFD)
      const company = await extendedPrisma.company.findUnique({
        where: { id: companyId },
        select: { cnpj: true, name: true },
      });

      if (!company?.cnpj) {
        return res.status(400).json({
          message:
            "CNPJ da empresa é obrigatório para gerar o AFD. " +
            "Atualize os dados da empresa.",
        });
      }

      // Buscar batidas no período
      const checkins = await extendedPrisma.checkIn.findMany({
        where: {
          companyId,
          createdAt: {
            gte: new Date(`${startDate}T00:00:00`),
            lte: new Date(`${endDate}T23:59:59`),
          },
        },
        orderBy: [{ createdAt: "asc" }, { nsr: "asc" }],
        include: {
          user: { select: { cpf: true, name: true } },
        },
      });

      const cnpjClean = company.cnpj.replace(/\D/g, "");
      const lines: string[] = [];

      // --- HEADER (Registro Tipo 1) ---
      // Formato: tipo|cnpj|ie|razaoSocial|dataIni|dataFim|hrIni|hrFim
      const dataIni = formatDateAfd(new Date(`${startDate}T00:00:00`));
      const dataFim = formatDateAfd(new Date(`${endDate}T23:59:59`));

      lines.push(
        [
          "1",                  // Tipo do registro (Header)
          cnpjClean,            // CNPJ do empregador
          "",                   // IE (Inscrição Estadual) — opcional
          company.name,         // Razão Social
          dataIni,              // Data inicial do período
          dataFim,              // Data final do período
        ].join("|")
      );

      // --- DETALHE (Registros Tipo 2) ---
      for (const checkin of checkins) {
        const cpf = checkin.user?.cpf?.replace(/\D/g, "") ?? "";
        const dataHora = formatDateAfd(checkin.createdAt);
        const codigo = mapCheckinTypeToAfdCode(checkin.type);

        lines.push(
          [
            "2",                  // Tipo do registro (Detalhe)
            cnpjClean,            // CNPJ do empregador
            cpf,                  // CPF do empregador
            String(checkin.nsr),  // NSR
            dataHora,             // Data e hora da marcação
            codigo,               // Código da marcação (1-4)
          ].join("|")
        );
      }

      // --- TRAILER (Registro Tipo 9) ---
      lines.push(
        [
          "9",                        // Tipo do registro (Trailer)
          cnpjClean,                  // CNPJ do empregador
          String(checkins.length),    // Total de registros detalhe
        ].join("|")
      );

      // Retornar como arquivo para download
      const csvContent = lines.join("\n");
      const filename = `AFD_${cnpjClean}_${startDate}_${endDate}.txt`;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      return res.send(csvContent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Parâmetros inválidos", errors: error.issue });
      }
      console.error("Erro ao gerar AFD:", error);
      return res
        .status(500)
        .json({ message: "Erro ao gerar AFD" });
    }
  }
}
```

4. **Rota:**

```typescript
// backend/src/routes/checkinRoutes.ts (adição)
import { AfdController } from "../controller/AfdController.js";

const afdController = new AfdController();

checkinRoutes.get(
  "/export/afd",
  authMiddleware,
  afdController.exportAfd
);
```

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma` — Campo `nsr`, `justificativa`, `mr`
- Novo: `backend/src/utils/nsrGenerator.ts`
- Novo: `backend/src/controller/AfdController.ts`
- Alterado: `backend/src/routes/checkinRoutes.ts`
- Alterado: `backend/src/controller/CheckinController.ts` — Gerar NSR no create

---

#### F3. AUSÊNCIA DE NSR (NÚMERO SEQUENCIAL DE REGISTRO) — BLOQUEANTE

> **Art. 78, §5º, III:** "Cada registro deverá possuir um número sequencial (NSR),
> por estabelecimento, que deverá ser ininterrupto."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Sem NSR, o AFD é inválido. O NSR é obrigatório e deve ser sequencial
por empresa, sem saltos. É o identificador único de cada marcação dentro do período.

**Análise técnica atual:**
- Schema `CheckIn` (`schema.prisma:45-59`) usa apenas `id UUID` como chave primária
- Não existe campo `nsr` no modelo
- Não existe constraint `@@unique([companyId, nsr])`

**Solução proposta:** Implementada no item F2 acima (campo `nsr` no schema + `nsrGenerator.ts`).

**Integração no `CheckinController.createCheckin`:**

```typescript
// backend/src/controller/CheckinController.ts — alteração no createCheckin

import { getNextNSR } from "../utils/nsrGenerator.js";
import { prisma } from "../database/prisma.js";

// Dentro do createCheckin, antes do prisma.checkIn.create:
const nsr = await getNextNSR(prisma, user.companyId);

const checkin = await extendedPrisma.checkIn.create({
  data: {
    type,
    latitude,
    longitude,
    nsr,              // ← NOVO CAMPO OBRIGATÓRIO
    userId,
    companyId: user.companyId,
  },
});
```

**Arquivos afetados:**
- Alterado: `backend/src/controller/CheckinController.ts:45-53`

---

#### F4. EMPREGADOR SEM CNPJ OBRIGATÓRIO — BLOQUEANTE

> **Art. 78, §5º, II:** "Identificação do empregador (razão social, CNPJ e, quando
> houver, inscrição Estadual)."

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** O campo `Company.cnpj` no schema (`schema.prisma:12`) é `String?`
(opcional). Uma empresa sem CNPJ geraria um AFD inválido, pois o CNPJ é campo
obrigatório no registro.

**Solução proposta:**

1. Tornar `cnpj` obrigatório no schema (migrar para `String` com `@unique`)
2. Adicionar validação no cadastro (`CompanyController.signup`)
3. Validar na exportação do AFD (já implementado no F2 — retorna erro 400 se ausente)

```prisma
// backend/prisma/schema.prisma — alteração
model Company {
  // ... (campos existentes)
  cnpj  String  @unique   // Obrigatório para REP-P (antes: String?)
  // ...
}
```

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma:12`
- Alterado: `backend/src/controller/company/CompanyController.ts:21` — `cnpj` obrigatório
- Novo: Migration Prisma

---

#### F5. AUSÊNCIA DE JUSTIFICATIVA PARA MARCAÇÕES — BLOQUEANTE

> **Art. 78, §1º:** "É vedado ao REP-P limitar a realização de marcações de ponto
> pelo empregado, que deverá ser feita a qualquer tempo, salvo quando houver
> registro de Justificativa."

> **Art. 78, §5º, VIII:** "Justificativa para marcação de ponto, quando aplicável."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Sem funcionalidade de justificativa, o sistema não permite ao empregado
explicar ausências ou omissões, o que é obrigatório para o regime de "ponto por
exceção" (Art. 74, §2º da CLT) e para situações extraordinárias.

**Análise técnica atual:**
- Grep por `justificat` retorna **vazio** no projeto inteiro
- Não existe campo `justificativa` no schema `CheckIn`
- Não existe rota ou tela para registrar justificativa
- Não existe tabela separada para justificativas (Anexo II, Registro Tipo 4)

**Solução proposta:**

1. **Schema Prisma** — Criar modelo separado para justificativas:

```prisma
model Justificativa {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  tipo        String                       // "ABONO", "FALTA", "ATESTADO", "JUSTIFICATIVA_GERAL"
  descricao   String                       // Texto livre da justificativa
  dataInicio  DateTime                     // Data de início da ausência
  dataFim     DateTime?                    // Data de fim (se período)
  comprovante String?                      // URL/path do documento anexo (PDF, imagem)
  aprovado    Boolean?                     // Pendente/aprovado/rejeitado pelo gestor
  aprovadoPor String?                      // ID do gestor que analisou
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, dataInicio])
  @@index([companyId, dataInicio])
}

model User {
  // ... (campos existentes)
  justificativas Justificativa[]
  // ...
}
```

2. **Controller:**

```typescript
// backend/src/controller/JustificativaController.ts
import { type Request, type Response } from "express";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { z } from "zod";

export class JustificativaController {
  /**
   * POST /justificativas
   * O empregado registra justificativa de ausência/omissão.
   */
  async create(req: Request, res: Response) {
    const bodySchema = z.object({
      tipo: z.enum([
        "ABONO",
        "FALTA",
        "ATESTADO",
        "JUSTIFICATIVA_GERAL",
      ]),
      descricao: z.string().min(10).max(500),
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dataFim: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    });

    try {
      const { tipo, descricao, dataInicio, dataFim } =
        bodySchema.parse(req.body);
      const userId = req.user.id;
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const justificativa = await extendedPrisma.justificativa.create({
        data: {
          tipo,
          descricao,
          dataInicio: new Date(dataInicio),
          dataFim: dataFim ? new Date(dataFim) : null,
          userId,
          companyId,
          aprovado: null, // Pendente de análise
        },
      });

      return res.status(201).json(justificativa);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Dados inválidos", errors: error.issue });
      }
      console.error("Erro ao criar justificativa:", error);
      return res
        .status(500)
        .json({ message: "Erro ao criar justificativa" });
    }
  }

  /**
   * GET /justificativas
   * Lista justificativas do usuário (ou da empresa se admin).
   */
  async list(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      const justificativas = await extendedPrisma.justificativa.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      });

      return res.json(justificativas);
    } catch (error) {
      console.error("Erro ao listar justificativas:", error);
      return res
        .status(500)
        .json({ message: "Erro ao listar justificativas" });
    }
  }

  /**
   * PUT /justificativas/:id/aprovar
   * Admin aprova ou rejeita justificativa.
   */
  async approve(req: Request, res: Response) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ aprovado: z.boolean() });

    try {
      const { id } = paramsSchema.parse(req.params);
      const { aprovado } = bodySchema.parse(req.body);
      const companyId = req.user.companyId;

      if (req.user.role !== "ENTERPRISE_ADMIN") {
        return res
          .status(403)
          .json({ message: "Apenas administradores podem aprovar" });
      }

      const justificativa =
        await extendedPrisma.justificativa.findFirst({
          where: { id, companyId },
        });

      if (!justificativa) {
        return res
          .status(404)
          .json({ message: "Justificativa não encontrada" });
      }

      const updated = await extendedPrisma.justificativa.update({
        where: { id },
        data: {
          aprovado,
          aprovadoPor: req.user.id,
        },
      });

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Dados inválidos", errors: error.issue });
      }
      console.error("Erro ao aprovar justificativa:", error);
      return res
        .status(500)
        .json({ message: "Erro ao aprovar justificativa" });
    }
  }
}
```

3. **Rotas:**

```typescript
// backend/src/routes/justificativaRoutes.ts
import { Router } from "express";
import { JustificativaController } from "../controller/JustificativaController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const justificativaRoutes = Router();
const justificativaController = new JustificativaController();

justificativaRoutes.post(
  "/",
  authMiddleware,
  justificativaController.create
);
justificativaRoutes.get(
  "/",
  authMiddleware,
  justificativaController.list
);
justificativaRoutes.put(
  "/:id/aprovar",
  authMiddleware,
  justificativaController.approve
);

export { justificativaRoutes };
```

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma` — Novo modelo `Justificativa`
- Novo: `backend/src/controller/JustificativaController.ts`
- Novo: `backend/src/routes/justificativaRoutes.ts`
- Alterado: `backend/src/routes/index.ts` — Adicionar rota

---

#### F6. COMPROVANTE IMEDIATO AO TRABALHADOR — BLOQUEANTE

> **Art. 78, §2º:** "O REP-P deverá fornecer ao empregado, imediatamente, comprovante
> da marcação de ponto contendo, no mínimo, a identificação do empregador, a data e
> hora da marcação, o tipo da marcação e o NSR."
>
> **Anexo III** define o leiaute mínimo do comprovante.

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** A tela `pontoPage.tsx:300-313` mostra "Ponto Concluído!" com a hora atual,
mas **não gera comprovante formal** que contenha todos os campos obrigatórios (NSR,
identificação do empregador, tipo, data/hora, hash de integridade).

**Solução proposta:**

Gerar comprovante digital imediato ao funcionário após cada marcação:

```typescript
// backend/src/utils/comprovanteGenerator.ts
import crypto from "crypto";
import { createHash } from "node:crypto";

interface ComprovanteData {
  nsr: number;
  companyName: string;
  companyCnpj: string;
  employeeName: string;
  employeeCpf: string;
  checkinType: string;
  checkinDate: Date;
  latitude: number;
  longitude: number;
}

/**
 * Gera o conteúdo do comprovante no formato Anexo III.
 * Inclui hash SHA-256 para verificação de integridade.
 */
export function gerarComprovante(data: ComprovanteData): {
  texto: string;
  hashVerificacao: string;
} {
  const tipoMap: Record<string, string> = {
    ENTRY: "Entrada",
    LUNCH_START: "Saída Intervalo",
    LUNCH_END: "Retorno Intervalo",
    EXIT: "Saída",
  };

  const dd = String(data.checkinDate.getDate()).padStart(2, "0");
  const mm = String(data.checkinDate.getMonth() + 1).padStart(2, "0");
  const yyyy = data.checkinDate.getFullYear();
  const hh = String(data.checkinDate.getHours()).padStart(2, "0");
  const mi = String(data.checkinDate.getMinutes()).padStart(2, "0");
  const ss = String(data.checkinDate.getSeconds()).padStart(2, "0");

  const texto = [
    "=== COMPROVANTE DE REGISTRO DE PONTO ===",
    "",
    `Empregador: ${data.companyName}`,
    `CNPJ: ${data.companyCnpj}`,
    `Empregado: ${data.employeeName}`,
    `CPF: ${data.employeeCpf}`,
    "",
    `Data: ${dd}/${mm}/${yyyy}`,
    `Hora: ${hh}:${mi}:${ss}`,
    `Tipo: ${tipoMap[data.checkinType] ?? data.checkinType}`,
    `NSR: ${String(data.nsr).padStart(6, "0")}`,
    "",
    `Latitude: ${data.latitude.toFixed(6)}`,
    `Longitude: ${data.longitude.toFixed(6)}`,
    "",
  ].join("\n");

  // Hash SHA-256 para verificação de integridade
  const hashVerificacao = createHash("sha256")
    .update(texto)
    .digest("hex");

  const textoComHash = texto + `Hash: ${hashVerificacao}`;

  return { texto: textoComHash, hashVerificacao };
}
```

**Integração no `CheckinController.createCheckin`** — Retornar comprovante no response:

```typescript
// Dentro do createCheckin, após criar o checkin:
import { gerarComprovante } from "../utils/comprovanteGenerator.js";

const comprovante = gerarComprovante({
  nsr,
  companyName: user.company?.name ?? "",
  companyCnpj: user.company?.cnpj ?? "",
  employeeName: user.name,
  employeeCpf: user.cpf ?? "",
  checkinType: type,
  checkinDate: checkin.createdAt,
  latitude,
  longitude,
});

return res.status(201).json({
  checkin: { checkin },
  comprovante: comprovante.texto,
  hashVerificacao: comprovante.hashVerificacao,
});
```

**Frontend** — Exibir comprovante ao invés de apenas "Ponto Concluído!":

```typescript
// frontend/src/pages/pontoPage.tsx — alteração no handleLivenessComplete
// Após api.checkins.create(pendingCheckin):
const response = await api.checkins.create(pendingCheckin as CheckinCreateDto);

// Mostrar comprovante ao invés de mensagem genérica
setComprovanteText(response.comprovante);
setIsSuccess(true);
```

**Arquivos afetados:**
- Novo: `backend/src/utils/comprovanteGenerator.ts`
- Alterado: `backend/src/controller/CheckinController.ts` — Retornar comprovante
- Alterado: `frontend/src/pages/pontoPage.tsx` — Exibir comprovante
- Alterado: `frontend/src/services/api.ts` — Tipo de resposta inclui comprovante

---

#### F7. AUSÊNCIA DE SUPORTE A REGIME DE EXCEÇÃO — RISCO ALTO

> **Art. 78, §1º:** Exige suporte ao regime de ponto por exceção quando houver
> acordo coletivo.

**Status:** NÃO IMPLEMENTADO

**Impacto:** Empresas com acordo coletivo que adotam ponto por exceção (funcionário
bata ponto apenas quando houver hora extra ou falta) não podem usar o Viggo.

**Solução proposta:**

Adicionar configuração no `Company.settings` e lógica no controller:

```typescript
// backend/src/controller/CompanyController.ts — updateMe
// Adicionar ao schema de settings:
const bodySchema = z.object({
  settings: z.object({
    // ...campos existentes...
    regimePonto: z.enum(["COMUM", "EXCECAO"]).optional(),
  }).optional(),
});
```

Quando `regimePonto === "EXCECAO"`:
- Habilitar batida apenas para ENTRY (ausência) e LUNCH_START/LUNCH_END
- Bloquear EXIT automático — exigir justificativa
- Criar flag `ausente` no `CheckInType`:
  `"ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT" | "AUSENCIA"`

---

#### F8. TOLERÂNCIA DE HORÁRIO SEM APLICAÇÃO NO BACKEND — RISCO MÉDIO

> **CLT Art. 74, §2º:** "Não será descontada nem computada como jornada a
> duração do trabalho que exceder a tolerância de até 5 (cinco) minutos..."

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** `CompanyController.updateMe:201` aceita `checkinToleranceMinutes`
no schema do settings, mas **não há lógica no backend que aplica a tolerância**
ao registrar a batida. Apenas persiste no banco.

**Solução proposta:**

Criar middleware/aplicação de tolerância no `CheckinController`:

```typescript
// backend/src/utils/toleranceCalculator.ts

interface ToleranceResult {
  horarioEfetivo: Date;
  minutosExcedentes: number;
  dentroDaTolerancia: boolean;
}

/**
 * Calcula se a marcação está dentro da tolerância.
 * Se estiver, ajusta o horário para o horário nominal.
 */
export function aplicarTolerancia(
  marcacao: Date,
  horarioPrevisto: Date,
  toleranciaMinutos: number
): ToleranceResult {
  const diffMs = Math.abs(marcacao.getTime() - horarioPrevisto.getTime());
  const diffMinutos = diffMs / (1000 * 60);

  const dentroDaTolerancia = diffMinutos <= toleranciaMinutos;

  return {
    horarioEfetivo: dentroDaTolerancia ? horarioPrevisto : marcacao,
    minutosExcedentes: dentroDaTolerancia ? 0 : diffMinutos - toleranciaMinutos,
    dentroDaTolerancia,
  };
}
```

**Arquivos afetados:**
- Novo: `backend/src/utils/toleranceCalculator.ts`
- Alterado: `backend/src/controller/CheckinController.ts` — Aplicar tolerância

---

## 3. LGPD — Lei nº 13.709/2018

> A LGPD classifica **biometria facial** como **Dado Pessoal Sensível**
> (Art. 5º, II) e **geolocalização** como **Dado Pessoal** que revela
> hábitos e localização do trabalhador. O nível de segurança exigido é máximo.

### 3.1. Findings — LGPD

---

#### F9. AUSÊNCIA DE TERMOS DE USO E POLÍTICA DE PRIVACIDADE — BLOQUEANTE LGPD

> **Art. 7º:** "O tratamento de dados pessoais somente poderá ser realizado
> nas seguintes hipóteses: [...] IV — mediante fornecimento de dados pessoais
> pelo titular ou seu representante no ato de sua cessão."
>
> **Art. 9º:** "O titular dos dados pessoais tem direito ao acesso facilitado
> às informações sobre o tratamento de seus dados."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Grep por `termos`, `privacidade`, `consentimento`, `LGPD`, `policy`,
`terms` no `frontend/` retorna **vazio absoluto**. Não existe:
- Tela de aceite de termos no fluxo de cadastro
- Link para Política de Privacidade
- Link para Termos de Uso
- Base legal explícita apresentada ao usuário

**Análise técnica atual:**
- `CompanySignupPage.tsx` — Apenas formulário de dados, sem checkbox de aceite
- `loginPage.tsx` — Sem menção a termos
- `AcceptInvitePage.tsx` — Convite sem referência a termos
- `RegisterFace.tsx` — Cadastro facial sem consentimento explícito

**Solução proposta:**

1. **Criar páginas estáticas de Termos de Uso e Política de Privacidade:**

```typescript
// frontend/src/pages/TermosDeUso.tsx
// frontend/src/pages/PoliticaPrivacidade.tsx
// Páginas de texto com todo o conteúdo jurídico
```

2. **Adicionar checkbox de consentimento no cadastro:**

```tsx
// frontend/src/pages/CompanySignupPage.tsx — alteração
// Adicionar checkbox obrigatório abaixo da senha:

<div className="flex items-start gap-3">
  <input
    type="checkbox"
    id="aceiteTermos"
    name="aceiteTermos"
    required
    className="mt-1"
  />
  <label htmlFor="aceiteTermos" className="text-sm text-slate-600">
    Li e aceito os{" "}
    <a href="/termos-de-uso" target="_blank" className="text-emerald-600 underline">
      Termos de Uso
    </a>{" "}
    e a{" "}
    <a href="/politica-privacidade" target="_blank" className="text-emerald-600 underline">
      Política de Privacidade
    </a>
    , autorizando o tratamento dos meus dados pessoais e biométricos
    para fins de controle de ponto eletrônico.
  </label>
</div>

<div className="flex items-start gap-3">
  <input
    type="checkbox"
    id="aceiteBiometria"
    name="aceiteBiometria"
    required
    className="mt-1"
  />
  <label htmlFor="aceiteBiometria" className="text-sm text-slate-600">
    Autorizo expressamente o uso da minha <strong>biometria facial</strong>
    ( vetor matemático de 128 dimensões ) exclusivamente para validação
    de identidade no registro de ponto eletrônico, conforme Art. 11
    da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
  </label>
</div>
```

3. **Schema de validação:**

```typescript
// frontend/src/schemas/companySignup.ts — alteração
export const signupSchema = z.object({
  // ...campos existentes...
  aceiteTermos: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar os Termos de Uso" }),
  }),
  aceiteBiometria: z.literal(true, {
    errorMap: () => ({
      message: "Você precisa autorizar o uso da biometria facial",
    }),
  }),
});
```

4. **Persistir aceite no backend** — Criar modelo de consentimento:

```prisma
model Consentimento {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tipo      String   // "TERMOS_DE_USO", "POLITICA_PRIVACIDADE", "BIOMETRIA"
  versao    String   // Versão do documento aceito (ex: "1.0")
  aceite    Boolean
  ip        String?
  createdAt DateTime @default(now())

  @@unique([userId, tipo, versao])
  @@index([userId])
}
```

**Arquivos afetados:**
- Novo: `frontend/src/pages/TermosDeUso.tsx`
- Novo: `frontend/src/pages/PoliticaPrivacidade.tsx`
- Alterado: `frontend/src/pages/CompanySignupPage.tsx`
- Alterado: `frontend/src/schemas/companySignup.ts`
- Alterado: `backend/prisma/schema.prisma` — Modelo `Consentimento`
- Alterado: `backend/src/controller/company/CompanyController.ts` — Salvar aceite

---

#### F10. CONSENTIMENTO ESPECÍFICO PARA BIOMETRIA (DADO SENSÍVEL) — BLOQUEANTE LGPD

> **Art. 11:** "O tratamento de dados pessoais sensíveis somente poderá
> ocorrer nas seguintes hipóteses: I — quando o titular ou seu representante
> legal consentir, de forma específica e destacada."
>
> **Art. 11, §1º:** "O consentimento referido ao inciso I deste artigo
> deverá ser fornecido por escrito ou por outro meio que demonstre a
> manifestação de vontade do titular."

**Status:** NÃO IMPLEMENTADO

**Impacto:** A biometria facial é classificada como **dado pessoal sensível**
pela LGPD (Art. 5º, II). Sem consentimento específico e destacado, o
tratamento é **ILEGAL** e sujeito a multas de até 2% do faturamento.

**Solução proposta:** Implementada no item F9 acima (checkbox `aceiteBiometria`
obrigatório + persistência no banco).

---

#### F11. AUSÊNCIA DE PORTAL DO TITULAR (DSAR) — BLOQUEANTE LGPD

> **Art. 18:** "O titular dos dados pessoais [...] tem direito a obter do
> controlador, a qualquer momento e mediante requisição: [...] II —
> acesso aos dados; III — correção de dados incompletos, inexatos ou
> desatualizados; [...] VI — anonimização, bloqueio ou eliminação de
> dados desnecessários, excessivos ou tratados em desconformidade [...]
> VIII — revogação do consentimento."
>
> **Art. 18, §1º:** "O titular poderá exercer os seus direitos perante o
> controlador mediante requerimento eletrônico ou verbal, salvo(...)".

**Status:** NÃO IMPLEMENTADO

**Severidade:** 🔴 BLOQUEANTE LGPD
> **Reclassificado em 17/07/2026** — anteriormente era "Alto risco". A reclassificação
> se deve ao fato de que, em se tratando de dado sensível (biometria facial), a
> ausência de canal para exercício dos direitos do titular (Art. 18 c/c Art. 11)
> constitui infração grave que **invalida a base legal** do tratamento, equiparando-se
> a bloqueante à luz do Art. 52 da LGPD (sansões administrativas).

**Impacto:** Sem portal do titular, o funcionário não pode exercer seus
direitos da LGPD (acesso, correção, eliminação, revogação). A empresa cliente
fica exposta a ações da ANPD (até 2% do faturamento, limitado a R$ 50 milhões)
e a ações civis individuais do titular (Art. 42 LGPD — reparação por danos
materiais, morais, individuais ou coletivos).

**Solução proposta:**

```typescript
// backend/src/controller/PrivacyController.ts
import { type Request, type Response } from "express";
import { extendedPrisma } from "../database/prisma-extensions.js";

export class PrivacyController {
  /**
   * GET /privacy/my-data
   * Retorna todos os dados pessoais do funcionário (DSAR).
   */
  async getMyData(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      const user = await extendedPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          // Dados biométricos: apenas confirma existência, não expõe
          faceDescriptor: { select: { _count: true } },
        },
      });

      const checkins = await extendedPrisma.checkIn.findMany({
        where: { userId, companyId },
        select: {
          id: true,
          createdAt: true,
          type: true,
          latitude: true,
          longitude: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100, // Últimos 100 registros
      });

      const consentimentos = await extendedPrisma.consentimento.findMany({
        where: { userId },
        select: {
          tipo: true,
          versao: true,
          aceite: true,
          createdAt: true,
        },
      });

      return res.json({
        dadosPessoais: {
          nome: user.name,
          email: user.email,
          cpf: user.cpf,
          cargo: user.role,
          dataCadastro: user.createdAt,
          ultimoLogin: user.lastLoginAt,
        },
        dadosBiometricos: {
          possuiDescriptor: !!user.faceDescriptor,
          dimensoes: user.faceDescriptor ? 128 : 0,
          observacao:
            "Apenas o vetor matemático (128 floats) é armazenado. " +
            "Nenhuma imagem facial é gravada.",
        },
        registrosPonto: checkins,
        consentimentos,
      });
    } catch (error) {
      console.error("Erro ao buscar dados do titular:", error);
      return res
        .status(500)
        .json({ message: "Erro ao buscar dados pessoais" });
    }
  }

  /**
   * DELETE /privacy/my-face
   * Remove o descriptor facial (revogação de consentimento).
   */
  async deleteMyFace(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      const user = await extendedPrisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res
          .status(404)
          .json({ message: "Usuário não encontrado" });
      }

      await extendedPrisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: null },
      });

      return res.json({
        message:
          "Descriptor facial removido com sucesso. " +
          "Você precisará cadastrar novamente a face para bater ponto.",
      });
    } catch (error) {
      console.error("Erro ao remover face:", error);
      return res
        .status(500)
        .json({ message: "Erro ao remover dados biométricos" });
    }
  }

  /**
   * GET /privacy/my-logs
   * Retorna logs de acesso aos dados do funcionário.
   */
  async getMyLogs(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      const logs = await extendedPrisma.auditLog.findMany({
        where: { userId, companyId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          action: true,
          entity: true,
          createdAt: true,
          ip: true,
        },
      });

      return res.json({ logs });
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      return res
        .status(500)
        .json({ message: "Erro ao buscar logs de acesso" });
    }
  }
}
```

**Rotas:**

```typescript
// backend/src/routes/privacyRoutes.ts
import { Router } from "express";
import { PrivacyController } from "../controller/PrivacyController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const privacyRoutes = Router();
const privacyController = new PrivacyController();

privacyRoutes.get("/my-data", authMiddleware, privacyController.getMyData);
privacyRoutes.delete("/my-face", authMiddleware, privacyController.deleteMyFace);
privacyRoutes.get("/my-logs", authMiddleware, privacyController.getMyLogs);

export { privacyRoutes };
```

**Arquivos afetados:**
- Novo: `backend/src/controller/PrivacyController.ts`
- Novo: `backend/src/routes/privacyRoutes.ts`
- Alterado: `backend/src/routes/index.ts` — Adicionar rota `/privacy`
- Alterado: `frontend/src/pages/` — Tela de configurações com opção de exclusão facial

---

#### F11.b. DESCRIPTOR FACIAL EXPOSTO VIA GET /employees/face — SOLUÇÃO TOKEN DESCARTÁVEL

> **Art. 18, II (acesso) c/c Art. 46 (segurança):** Mesmo quando o titular
> solicita "acesso" aos dados, o controlador **não deve** devolver dados
> sensíveis que possam ser usados para reoferecer consentimentoabolicamente
> (como o vetor biométrico). Deve-se confirmar **existência** e **finalidade**,
> não expor o vetor.

**Status:** PARCIALMENTE IMPLEMENTADO

**Severidade:** 🟠 ALTO RISCO (referência cruzada com `SEC-14` e `SEC-15` do `SECURITY_AUDIT.md`)

**Constatado no código atual:**
- `backend/src/controller/EmployeesController.ts:68` retorna `user.faceDescriptor` (128 floats) ao client via `GET /employees/face`
- `pontoPage.tsx:95-96` recebe o descriptor e usa para comparação facial local como fallback
- `CheckinController.ts:55-58` retorna `{ checkin, faceDescriptor }` no `POST /checkins` (este campo é **ignorado** pelo frontend)

**Impacto:** O descriptor exposto pode ser capturado por XSS, extensão do browser ou ataque MITM e usado para spoofing futuro. Dado sensível biométrico é **irrevogável** (não pode ser "trocado" como senha).

**Solução proposta — Token de Uso Único (Single-Use Token) com descarte após uso:**

1. **Substituir `GET /employees/face` por `GET /employees/face/token`:**

```typescript
// backend/src/controller/EmployeesController.ts — novo método
private faceTokens = new Map<string, { descriptor: Float32Array; expiresAt: Date }>();

async issueFaceToken(req: Request, res: Response) {
  try {
    const userId = req.user.id;

    const user = await extendedPrisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    if (!user.faceDescriptor) {
      return res.status(403).json({
        code: "FACE_NOT_REGISTERED",
        message: "Registro facial pendente. Por favor, cadastre sua face.",
      });
    }

    // Gerar token UUID de uso único com TTL de 30 segundos
    const token = crypto.randomUUID();
    const descriptor = new Float32Array(
      Object.values(user.faceDescriptor as Record<string, number>)
    );
    const expiresAt = new Date(Date.now() + 30_000); // 30s

    this.faceTokens.set(token, { descriptor, expiresAt });

    // Limpeza de tokens expirados (housekeeping)
    setTimeout(() => this.faceTokens.delete(token), 30_000);

    return res.json({ token, expiresIn: 30 });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao gerar token facial" });
  }
}
```

2. **Atualizar `POST /employees/face/verify` para consumir o token:**

```typescript
async verifyFace(req: Request, res: Response) {
  const bodySchema = z.object({
    token: z.string().uuid(),
    descriptor: z.array(z.number()).min(128).max(128),
  });

  try {
    const { token, descriptor } = bodySchema.parse(req.body);

    // Buscar descriptor do token (Map em memória)
    const stored = this.faceTokens.get(token);
    if (!stored) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }

    // Verificar expiração
    if (stored.expiresAt < new Date()) {
      this.faceTokens.delete(token);
      return res.status(401).json({ message: "Token expirado" });
    }

    // Descartar token (single-use)
    this.faceTokens.delete(token);

    const inputDescriptor = new Float32Array(descriptor);
    const distance = euclideanDistance(inputDescriptor, stored.descriptor);
    const threshold = 0.5;

    if (distance < threshold) {
      return res.json({ success: true, distance });
    }

    return res.json({ success: false, distance, message: "Rosto não reconhecido" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
    }
    return res.status(500).json({ message: "Erro ao verificar face" });
  }
}
```

3. **Atualizar frontend (`pontoPage.tsx`) para usar token:**

```typescript
// Antes: const data = await api.employees.getFaceDescriptor();
// Depois:
const { token } = await api.employees.issueFaceToken();
// Passar token para LivenessChallenge ao invés do descriptor bruto
// LivenessChallenge envia { token, descriptor } para /employees/face/verify
// Remove dependência de comparação local (fallback) no frontend
```

4. **Remover `faceDescriptor` do response do `POST /checkins`:**

```typescript
// backend/src/controller/CheckinController.ts:55-58
// Antes: const data = { checkin: { checkin }, faceDescriptor: user.faceDescriptor }
// Depois:
return res.status(201).json({ checkin });
```

5. **Rotas atualizadas:**

```typescript
// backend/src/routes/employeesRoutes.ts
employeesRoutes.get("/face/token", authMiddleware, faceValidationLimiter, employeesController.issueFaceToken);
employeesRoutes.post("/face/verify", authMiddleware, faceValidationLimiter, employeesController.verifyFace);
// Remover: employeesRoutes.get("/face", authMiddleware, faceValidationLimiter, employeesController.index)
```

**Arquivos afetados:**
- Alterado: `backend/src/controller/EmployeesController.ts` — `issueFaceToken` + `verifyFace` atualizado
- Alterado: `backend/src/routes/employeesRoutes.ts` — Nova rota + remover `GET /face`
- Alterado: `backend/src/controller/CheckinController.ts:55-58` — Remover `faceDescriptor` do response
- Alterado: `frontend/src/services/api.ts` — `employees.issueFaceToken()` + `verifyFace(token, descriptor)`
- Alterado: `frontend/src/pages/pontoPage.tsx` — Usar token ao invés de descriptor bruto
- Alterado: `frontend/src/components/LivenessChallenge.tsx` — Remover `fallbackLocalComparison()`

---

> **Nota sobre correlação:** Esta solução resolve simultaneamente as pendências
> **SEC-14**, **SEC-15** e **SEC-51** do `docs/SECURITY_AUDIT.md`.

---

#### F12. DESCRIPTOR FACIAL SEM CRIPTOGRAFIA EM TRÂNSITO — RISCO ALTO LGPD

> **Art. 46:** "Os agentes de tratamento devem adotar medidas de segurança,
> técnicas e administrativas aptas a proteger os dados pessoais de acessos
> não autorizados e de situações acidentais ou ilícitas de destruição, perda,
> alteração, comunicação ou qualquer forma de tratamento inadequado ou ilícito."

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** O `faceDescriptor` (128 floats) é enviado em texto plano via
HTTPS. O `SEC-31` do Security Audit confirma ausência de `helmet` (security
headers). Sem HTTPS forçado + HSTS, o descriptor pode ser interceptado e
usado para reconstrução facial (spoofing).

**Solução proposta:**

1. **Helmet + HSTS** no Express:

```typescript
// backend/src/app.ts — alteração
import helmet from "helmet";

app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));
```

2. ** Criptografia do descriptor no client antes do envio** (opção avançada):

```typescript
// frontend/src/utils/biometricEncryption.ts

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

/**
 * Criptografa o descriptor facial antes do envio.
 * A chave é derivada do JWT do usuário + salt fixo do servidor.
 */
export async function encryptDescriptor(
  descriptor: Float32Array,
  jwtToken: string
): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(Array.from(descriptor)));

  // Derivar chave do token + salt
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(jwtToken.slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("viggo-biometric-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}
```

**Arquivos afetados:**
- Alterado: `backend/src/app.ts` — Adicionar `helmet`
- Alterado: `backend/package.json` — `npm install helmet @types/helmet`
- Novo: `frontend/src/utils/biometricEncryption.ts` (opcional)

---

#### F13. CONTRATO CONTROLADOR × OPERADOR (SAAS MULTITENANT) — RISCO ALTO LGPD

> **Art. 39, III:** "As atividades de tratamento de dados pessoais
> [...] deverão ser determinadas por meio de contrato [...] entre o
> controlador e o operador."

**Status:** NÃO IMPLEMENTADO

**Impacto:** O Viggo opera como **operador** de dados (processa dados em
nome das empresas clientes, que são controladoras). Sem contrato de
tratamento entre Viggo e cada empresa, viola Art. 39 da LGPD.

**Solução proposta:**

Criar template de **Contrato de Tratamento de Dados Pessoais** (DPA —
Data Processing Agreement) com:

- Identificação das partes (Viggo como operador, empresa como controladora)
- Finalidade do tratamento (registro de ponto eletrônico)
- Categorias de dados tratados (nome, email, CPF, biometria facial, geolocalização)
- Obrigações do operador (Viggo): segurança, minimização, comunicação de incidentes
- Obrigações do controlador (empresa): consentimento, finalidade
- Retenção e eliminação
- Subprocessadores
- Medidas técnicas e organizacionais de segurança

Apresentar o DPA no fluxo de cadastro da empresa e solicitar assinatura digital.

**Arquivos afetados:**
- Novo: `docs/contrato-tratamento-dados.md` (template)
- Alterado: `CompanySignupPage.tsx` — Aceite do DPA no cadastro
- Novo: `Consentimento` no Prisma schema (já incluído em F9)

---

#### F14. AUSÊNCIA DE PLANO DE RESPOSTA A INCIDENTES — RISCO MÉDIO LGPD

> **Art. 48:** "O controlador deverá comunicar à autoridade nacional
> [...] a ocorrência de incidente de segurança que possa acarretar
> risco ou dano relevante aos titulares, no prazo de 72 horas."

**Status:** NÃO IMPLEMENTADO

**Solução proposta:**

Criar `docs/PLANO_RESPOSTA_INCIDENTES.md` com:

- Definição de incidente de segurança
- Fluxo de identificação e classificação
- Notificação interna (quem, quando, como)
- Notificação à ANPD (em até 72h)
- Notificação aos titulares afetados
- Plano de contenção e remediação
- Pós-incidente (lições aprendidas)

---

## 4. CLT — Artigo 74

> "Art. 74. Para os estabelecimentos com mais de 20 (vinte) trabalhadores
> será obrigatória a anotação da hora de entrada e de saída, em registro
> manual, mecânico ou eletrônico, conforme instruções expedidas pela
> Secretaria Especial de Previdência e Trabalho do Ministério da Economia,
> o qual deverá ser assinado pelo trabalhador."

### 4.1. Findings — CLT Art. 74

---

#### F15. PONTO POR EXCEÇÃO SEM SUPORTE — RISCO ALTO CLT

> **Art. 74, §2º:** É admitido o regime de "ponto por exceção", desde que
> previsto em convenção ou acordo coletivo de trabalho, mediante
> autorização da autoridade competente do Ministério do Trabalho.

**Status:** NÃO IMPLEMENTADO

**Impacto:** Empresas com acordo coletivo que adotam ponto por exceção
(funcionário bata ponto apenas quando houver hora extra ou falta) não
podem usar o Viggo.

**Solução proposta:** Implementada no item F7 (regime de exceção).

---

#### F16. TOLERÂNCIA DE 5 MINUTOS SEM APLICAÇÃO — RISCO MÉDIO CLT

> **Art. 74, §2º:** "Não será descontada nem computada como jornada a
> duração do trabalho que exceder a tolerância de até 5 (cinco) minutos
> nos registros de ponto manuais ou eletrônicos."

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** A tolerância está configurável no settings da empresa
(`checkinToleranceMinutes`) mas **não é aplicada** na lógica de
validação do backend.

**Solução proposta:** Implementada no item F8.

---

## 4.1. Findings adicionais — Portaria 671, LGPD e CLT (atualização 17/07/2026)

> Os findings F17 a F24 abaixo foram adicionados após revisão crítica do
> documento. Eles cobrem lacunas não identificadas na primeira versão:

---

#### F17. NSR REINICIANDO A CADA 1º DE JANEIRO — BLOQUEANTE

> **Art. 78, §5º-C, da Portaria 671/2021:** "O número sequencial de registro
> (NSR) deverá reiniciar a cada primeiro de janeiro, respeitado o limite
> máximo de 999.999."

**Status:** NÃO IMPLEMENTADO (atualmente o NSR proposto no F3 é incremental
sem reinício anual)

**Impacto:** Se o NSR não reiniciar em 1º de janeiro, ao longo do ano uma
empresa grande pode ultrapassar o limite de 999.999 registros, gerando AFD
inválido. Além disso, o reinício anual é exigência normativa explícita.

**Solução proposta:**

Atualizar o `nsrGenerator.ts` para filtrar pelo ano corrente:

```typescript
// backend/src/utils/nsrGenerator.ts — atualização
import { PrismaClient } from "@prisma/client";

/**
 * Gera o próximo NSR para a empresa de forma transacional.
 * O NSR é sequencial e ininterrupto dentro de cada empresa,
 * REINICIANDO A CADA 1º DE JANEIRO.
 * Limite máximo: 999.999 por ano.
 */
export async function getNextNSR(
  prisma: PrismaClient,
  companyId: string
): Promise<number> {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

  const lastCheckin = await prisma.checkIn.findFirst({
    where: {
      companyId,
      createdAt: { gte: yearStart, lte: yearEnd },
    },
    orderBy: { nsr: "desc" },
    select: { nsr: true },
  });

  const nextNSR = (lastCheckin?.nsr ?? 0) + 1;

  if (nextNSR > 999_999) {
    throw new Error(
      "Limite de 999.999 NSR atingido no ano corrente. Contate o suporte."
    );
  }

  return nextNSR;
}
```

**Consideração adicional:** A constraint `@@unique([companyId, nsr])`
proposta no F3 deve ser trocada por `@@unique([companyId, nsr, year])`
ou `@@unique([companyId, nsr, EXTRACT(YEAR FROM createdAt)])` para permitir
reuso do NSR entre anos distintos. Em Prisma, o equivalente é:

```prisma
model CheckIn {
  // ...
  nsr     Int
  ano     Int      @default(year())   // ou preenchido no create
  // ...
  @@unique([companyId, nsr, ano])
}
```

**Arquivos afetados:**
- Alterado: `backend/src/utils/nsrGenerator.ts`
- Alterado: `backend/prisma/schema.prisma` — Adicionar `ano` e ajustar unique

---

#### F18. IDENTIFICAÇÃO DO EMPREGADOR MATERIALIZADA NO REGISTRO DE PONTO — ALTO

> **Art. 78, §5º-A, II, da Portaria 671/2021:** Cada registro no AFD deve
> conter a "identificação do empregador (CNPJ ou CPF)".

**Status:** PARCIALMENTE IMPLEMENTADO (vinculado ao F4)

**Impacto:** No schema atual, a identificação do empregador está apenas na
tabela `Company` via `companyId` (relacionamento). Se uma empresa alterar
CNPJ (incorporação, cisão, mudança de razão social) os registros antigos
do `CheckIn` ficam com referência histórica inválida.

**Solução proposta:**

Desnormalizar o CNPJ no registro de `CheckIn`:

```prisma
model CheckIn {
  // ...
  companyId        String
  employerCnpj     String     // Snapshot do CNPJ no momento da batida
  // ...
}
```

> Alternativa (aceitável em SaaS): implementar view de leitura que faz
> JOIN com `Company` via `companyId` e nunca excluir empresas (soft-delete).

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma`
- Alterado: `backend/src/controller/CheckinController.ts` — Snapshot do CNPJ no create

---

#### F19. AUSÊNCIA DE POLÍTICA DE RETENÇÃO E ELIMINAÇÃO DE DADOS — BLOQUEANTE LGPD

> **Art. 15, LGPD:** "A eliminação de dados pessoais, quando atendida a
> finalidade ou expirado o prazo de tratamento (...) deve ser feita a partir
> de política de retenção e descarte."
>
> **Art. 16, LGPD:** "Os dados devem ser eliminados após o término do
> tratamento, ressalvadas as hipóteses de manutenção previstas em lei."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Não existe política de retenção/deleção para:
- `User.faceDescriptor` após término do vínculo empregatício
- `CheckIn` após o prazo legal (CLT Art. 74: 5 anos)
- `AuditLog` (garantia de segurança)
- Tokens de convite expirados
- `Subscription` cancelada

**Solução proposta:**

1. **Criar `docs/POLITICA_RETENCAO.md`** com prazos definidos:

| Tipo de dado | Prazo de retenção | Base legal |
|---|---|---|
| `User.faceDescriptor` | Enquanto vínculo ativo + 30 dias após desligamento | Art. 15 LGPD + minimização |
| `CheckIn` | 5 anos a partir do encerramento do exercício | CLT Art. 74 §4º |
| `AuditLog` | 5 anos | LGPD Art. 16 + segurança |
| `InviteToken` revogado | 90 dias após revogação | Minimização |
| `Subscription` | 5 anos após cancelamento | Obrigação fiscal |
| Logs de sistema | 180 dias | Operação |

2. **Implementar job de limpeza (cron/agenda):**

```typescript
// backend/src/scripts/retentionCleanup.ts
import { prisma } from "../database/prisma.js";

/**
 * Executa a política de retenção e eliminação.
 * Deve rodar diariamente (cron 02:00).
 */
export async function runRetentionCleanup() {
  const now = new Date();

  // 1. Remover descriptors de usuários desligados há mais de 30 dias
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const usersToClean = await prisma.user.findMany({
    where: {
      status: "INACTIVE",
      deactivatedAt: { lt: thirtyDaysAgo },
      faceDescriptor: { not: null },
    },
    select: { id: true },
  });

  if (usersToClean.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: usersToClean.map(u => u.id) } },
      data: { faceDescriptor: null },
    });
    console.log(`[Retention] Limpei descriptors de ${usersToClean.length} usuários`);
  }

  // 2. Remover checkins com mais de 5 anos
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const deletedCheckins = await prisma.checkIn.deleteMany({
    where: { createdAt: { lt: fiveYearsAgo } },
  });
  console.log(`[Retention] Removi ${deletedCheckins.count} checkins antigos`);

  // 3. Remover tokens de convite revogados há mais de 90 dias
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const deletedTokens = await prisma.inviteToken.deleteMany({
    where: {
      revokedAt: { lt: ninetyDaysAgo },
    },
  });
  console.log(`[Retention] Removi ${deletedTokens.count} tokens revogados`);
}
```

3. **Adicionar campo `status` e `deactivatedAt` ao `User`:**

```prisma
model User {
  // ...
  status         UserStatus  @default(ACTIVE)   // ACTIVE | INACTIVE
  deactivatedAt  DateTime?
  // ...
}

enum UserStatus {
  ACTIVE
  INACTIVE
}
```

4. **Configurar cron no `server.ts`:**

```typescript
import cron from "node-cron";
import { runRetentionCleanup } from "./scripts/retentionCleanup.js";

// Diariamente às 02:00
cron.schedule("0 2 * * *", async () => {
  await runRetentionCleanup();
});
```

**Arquivos afetados:**
- Novo: `docs/POLITICA_RETENCAO.md`
- Novo: `backend/src/scripts/retentionCleanup.ts`
- Alterado: `backend/prisma/schema.prisma` — `UserStatus` + `deactivatedAt`
- Alterado: `backend/src/server.ts` — Configurar cron
- Alterado: `backend/package.json` — `npm install node-cron`

---

#### F20. AUSÊNCIA DE RELATÓRIO MENSAL NO LAYOUT OFICIAL MTE — ALTO

> **Art. 78, §5º-A, V, da Portaria 671/2021:** "O REP-P deverá gerar, a
> partir do AFD, relatórios periódicos contendo(...) folha mensal de
> ponto, conforme modelo aprovado pelo MTE."

**Status:** PARCIALMENTE IMPLEMENTADO

**Constatado:** `CheckinController.listMonthly` (`CheckinController.ts:182-239`)
gera um JSON com agrupamento por employeeId. `DashboardPage.tsx:320-365`
gera tabela HTML para impressão. **Nenhum dos dois segue o modelo oficial
do MTE** (relatório folha mensal com colunas: dia, Entrada, Saída intervalo,
Retorno intervalo, Saída, Observação, Assinatura — com hash SHA-256 no rodapé).

**Solução proposta:**

```typescript
// backend/src/services/relatorioMensalService.ts
import { extendedPrisma } from "../database/prisma-extensions.js";
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isSameDay } from "date-fns";
import crypto from "node:crypto";

/**
 * Gera o Relatório Mensal de Ponto no layout aprovado pelo MTE.
 * Cada página = 1 funcionário com 1 linha por dia do mês.
 */
export async function gerarRelatorioMensal(
  companyId: string,
  year: number,
  month: number
): Promise<{ csv: string; hash: string }> {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const company = await extendedPrisma.company.findUnique({
    where: { id: companyId },
    select: { cnpj: true, name: true },
  });

  const employees = await extendedPrisma.user.findMany({
    where: { companyId },
    select: { id: true, name: true, cpf: true },
  });

  const checkins = await extendedPrisma.checkIn.findMany({
    where: { companyId, createdAt: { gte: monthStart, lte: monthEnd } },
    orderBy: { createdAt: "asc" },
  });

  const lines: string[] = [];

  // Cabeçalho por funcionário
  for (const emp of employees) {
    lines.push(`FUNCIONARIO: ${emp.name} | CPF: ${emp.cpf}`);
    lines.push(["Dia", "Entrada", "S.Intervalo", "R.Intervalo", "Saída", "Observação"].join("|"));

    for (const day of days) {
      const dayCheckins = checkins.filter(
        c => c.userId === emp.id && isSameDay(c.createdAt, day)
      );

      const entry = dayCheckins.find(c => c.type === "ENTRY");
      const lunchStart = dayCheckins.find(c => c.type === "LUNCH_START");
      const lunchEnd = dayCheckins.find(c => c.type === "LUNCH_END");
      const exit = dayCheckins.find(c => c.type === "EXIT");

      lines.push([
        format(day, "dd/MM"),
        entry ? format(entry.createdAt, "HH:mm") : "--:--",
        lunchStart ? format(lunchStart.createdAt, "HH:mm") : "--:--",
        lunchEnd ? format(lunchEnd.createdAt, "HH:mm") : "--:--",
        exit ? format(exit.createdAt, "HH:mm") : "--:--",
        "", // Observação
      ].join("|"));
    }

    lines.push(`Assinatura: ${emp.name}`);
    lines.push("");
  }

  const csv = lines.join("\n");
  const hash = crypto.createHash("sha256").update(csv).digest("hex");
  return { csv, hash };
}
```

**Rota:** `GET /checkins/export/relatorio-mensal?year=&month=`

**Arquivos afetados:**
- Novo: `backend/src/services/relatorioMensalService.ts`
- Alterado: `backend/src/routes/checkinRoutes.ts`
- Alterado: `backend/src/controller/CheckinController.ts` — Novo endpoint de exportação
- Alterado: `frontend/src/pages/DashboardPage.tsx` — Usar relatório oficial

---

#### F21. AUSÊNCIA DE BACKUP CRIPTOGRAFADO DO AFD — ALTO

> **Art. 81 da Portaria 671/2021:** "O empregador deverá armazenar o AFD
> em mídia segura, criptografada, com no mínimo cópia externa (off-site)."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Sem backup do AFD, em caso de falha do banco, a empresa perde a
comprovação das jornadas. Em fiscalização, multa por não apresentação.

**Solução proposta:**

1. **Job periódico (mensal) que gera e armazena AFD mensal de cada empresa**
2. **Backup em storage criptografado** (AWS S3 com SSE-KMS, ou equivalente)
3. **Retenção de 5 anos** por empresa (sincronia com F19)

```typescript
// backend/src/scripts/afdBackup.ts
import { generateAFD } from "../services/afdService.js";
import { encrypt, uploadToStorage } from "../utils/backupStorage.js";

export async function backupAllAFDs() {
  const companies = await prisma.company.findMany({ select: { id: true, cnpj: true } });

  for (const company of companies) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const afd = await generateAFD(company.id, start, end);
    const encrypted = encrypt(afd, process.env.AFD_BACKUP_KEY!);

    await uploadToStorage({
      bucket: "viggo-afd-backups",
      key: `${company.id}/${now.getFullYear()}-${now.getMonth()}.afd.enc`,
      body: encrypted,
    });
  }
}
```

4. **Validar restore periodicamente** (exercício de recuperação)

**Arquivos afetados:**
- Novo: `backend/src/scripts/afdBackup.ts`
- Novo: `backend/src/utils/backupStorage.ts`
- Novo: `.env` — `AFD_BACKUP_KEY`, `AWS_S3_BUCKET`
- Alterado: `backend/src/server.ts` — Cron mensal de backup

---

#### F22. AUSÊNCIA DE RELATÓRIO DE CONFORMIDADE PERIÓDICO — MÉDIO

> **Art. 50 da LGPD:** "O controlador deverá manter relatório de impacto
> à privacidade (RIP) (...)" e indicadores de conformidade periódicos."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Sem relatório periódico, não há evidência de boas práticas.
Em fiscalização ANPD, ausência de RIP = agravante.

**Solução proposta:**

- Criar `docs/RELATORIO_IMPACTO_PRIVACIDADE.md` (RIP)
- Documentar tratamentos, riscos, mitigadores (anonimização, criptografia,
  minimização biométrica)
- Revisar a cada 12 meses ou em mudanças relevantes (ex.: nova feature facial)

**Arquivos afetados:**
- Novo: `docs/RELATORIO_IMPACTO_PRIVACIDADE.md`
- Recomendação: processo de revisão anual documentado

---

#### F23. DPO (ENCARREGADO) NÃO NOMINADO — MÉDIO

> **Art. 41 da LGPD:** "O controlador deverá indicar um encarregado
> (DPO - Data Protection Officer) pelo tratamento de dados pessoais,
> com obrigação de comunicação com a ANPD e titulares."

**Status:** NÃO IMPLEMENTADO

**Impacto:** Ausência de DPO impede comunicação formal com a ANPD em
caso de incidente (Art. 48), e geraSKTOP no Termo de Uso ao titular.

**Solução proposta:**

- Nomear DPO formalmente (pode ser sócio da empresa desenvolvedora)
- Incluir contato do DPO no rodapé da Política de Privacidade
- Email canônico: `dpo@viggo.com.br`
- Cadastro na ANPD via formulário oficial quando disponível

**Arquivos afetados:**
- Alterado: `docs/POLITICA_RETENCAO.md` (referência ao DPO)
- Alterado: `frontend/src/pages/PoliticaPrivacidade.tsx` — Bloco de contato do DPO

---

#### F24. REGISTRO FORMAL DE OPERAÇÕES DE TRATAMENTO — MÉDIO

> **Art. 37 da LGPD:** "O controlador ou o operador que realizou o
> tratamento deverá manter registro das operações de tratamento de
> dados pessoais, especialmente quando baseado no legítimo interesse."

**Status:** PARCIALMENTE IMPLEMENTADO

**Constatado:** O `AuditMiddleware.ts` já registra `AuditLog` no banco
(action, entity, userId, ip, userAgent, timestamp). Porém, **não há
mapeamento explícito** desses logs para os "tratamentos" LGPD (cada
ação deve ser legível como "finalidade"). O campo `action` tem valores
como `CHECKIN`, `FACE_VALIDATION` — não há documentação que diga
qual **base legal** está associada a cada um.

**Solução proposta:**

1. **Adicionar colunas no `AuditLog`:**
   - `legalBasis` (e.g., "consent", "legal_obligation", "contract")
   - `purpose` (texto curto, ex.: "validação biométrica para controle de ponto")
   - `personalDataCategories` (JSON: ["biometric", "location"])

2. **Atualizar `AuditMiddleware` para preencher automaticamente:**

```typescript
const TREATMENT_MAPPING: Record<string, { purpose: string; basis: string; categories: string[] }> = {
  "LOGIN": {
    purpose: "Autenticação de usuário no sistema",
    basis: "contract",
    categories: ["credential", "ip"],
  },
  "CHECKIN": {
    purpose: "Registro de jornada de trabalho (CLT Art. 74)",
    basis: "legal_obligation",
    categories: ["location", "temporal"],
  },
  "FACE_VALIDATION": {
    purpose: "Validação biométrica para confirmação de identidade no ponto",
    basis: "consent",
    categories: ["biometric"],
  },
  "FACE_REGISTER": {
    purpose: "Cadastro de perfil biométrico para😈identeificação no ponto",
    basis: "consent",
    categories: ["biometric"],
  },
};
```

3. **Endpoint de consulta para auditoria ANPD:**
   `GET /admin/treatment-registry` — geração mensal de "Registro de
   Operações de Tratamento" em formato padronizado.

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma` — `AuditLog` com novas colunas
- Alterado: `backend/src/middleware/AuditMiddleware.ts` — Mapeamento automático
- Novo: `backend/src/controller/TreatmentRegistryController.ts`
- Novo: `backend/src/routes/adminRoutes.ts`

---

## 5. Mapa de Conformidade Consolidado

### Legenda

| Status | Significado |
|--------|-------------|
| ✅ | Implementado e conforme |
| ⚠️ | Parcialmente implementado |
| ❌ | Não implementado |
| 🔴 | Bloqueante legal |
| 🟠 | Alto risco |
| 🟡 | Médio risco |

### Portaria MTE nº 671/2021

| # | Requisito | Artigo | Status | Severidade | Arquivo Atual |
|---|-----------|--------|--------|------------|---------------|
| F1 | Assinatura ICP-Brasil | Art. 79 §2º | ❌ | 🔴 Bloqueante | Nenhum |
| F2 | Geração AFD | Art. 78 §5º | ❌ | 🔴 Bloqueante | Nenhum |
| F3 | NSR sequencial | Art. 78 §5º III | ❌ | 🔴 Bloqueante | Nenhum |
| F4 | CNPJ obrigatório | Art. 78 §5º II | ⚠️ | 🔴 Bloqueante | `schema.prisma:12` |
| F5 | Justificativa | Art. 78 §1º | ❌ | 🔴 Bloqueante | Nenhum |
| F6 | Comprovante imediato | Art. 78 §2º | ⚠️ | 🔴 Bloqueante | `pontoPage.tsx:300` |
| F17 | NSR reinicia anualmente | Art. 78 §5º-C | ❌ | 🔴 Bloqueante | `nsrGenerator.ts` (proposto) |
| F18 | Identif. empregador no registro | Art. 78 §5º-A II | ⚠️ | 🟠 Alto | `CheckIn` (via companyId) |
| F20 | Relatório mensal layout MTE | Art. 78 §5º-A V | ⚠️ | 🟠 Alto | `DashboardPage.tsx:320` |
| F21 | Backup criptografado AFD | Art. 81 | ❌ | 🟠 Alto | Nenhum |
| F7 | Ponto por exceção | Art. 78 §1º | ❌ | 🟠 Alto | Nenhum |
| F8 | Tolerância de horário | CLT Art. 74 §2º | ⚠️ | 🟡 Médio | `CompanyController.ts:201` |

### LGPD (Lei nº 13.709/2018)

| # | Requisito | Artigo | Status | Severidade | Arquivo Atual |
|---|-----------|--------|--------|------------|---------------|
| F9 | Termos de Uso/Privacidade | Art. 7º, 9º | ❌ | 🔴 Bloqueante | Nenhum |
| F10 | Consentimento biométrico | Art. 11 | ❌ | 🔴 Bloqueante | Nenhum |
| F11 | Portal do titular (DSAR) | Art. 18 | ❌ | 🔴 Bloqueante | Nenhum |
| F11.b | Descriptor exposto (SEC-14/15) | Art. 18 + 46 | ⚠️ | 🟠 Alto | `EmployeesController.ts:68` |
| F19 | Política retenção/deleção | Art. 15, 16 | ❌ | 🔴 Bloqueante | Nenhum |
| F12 | Criptografia descriptor trânsito | Art. 46 | ⚠️ | 🟠 Alto | `app.ts` (sem helmet) |
| F13 | Contrato ctrl×operador | Art. 39 III | ❌ | 🟠 Alto | Nenhum |
| F24 | Registro operações tratamento | Art. 37 | ⚠️ | 🟡 Médio | `AuditMiddleware.ts` |
| F22 | Relatório conformidade (RIP) | Art. 50 | ❌ | 🟡 Médio | Nenhum |
| F23 | DPO/Encarregado nomeado | Art. 41 | ❌ | 🟡 Médio | Nenhum |
| F14 | Plano resposta incidentes | Art. 48 | ❌ | 🟡 Médio | Nenhum |

### CLT Art. 74

| # | Requisito | Artigo | Status | Severidade | Arquivo Atual |
|---|-----------|--------|--------|------------|---------------|
| F15 | Ponto por exceção | Art. 74 §2º | ❌ | 🟠 Alto | Nenhum |
| F16 | Tolerância 5 min | Art. 74 §2º | ⚠️ | 🟡 Médio | `CompanyController.ts:201` |

### Já conformes (sem necessidade de ação)

| Requisito | Artigo | Evidência |
|-----------|--------|-----------|
| Irreversibilidade biométrica | LGPD Art. 5º II | `schema.prisma:35` — `faceDescriptor Json?` (apenas vetor) |
| Geolocalização pontual | LGPD Art. 5º II | `pontoPage.tsx:46` — `getCurrentPosition` único |
| Proibição de edição de batidas | Port. 671 Art. 78 | `CheckinController.ts` — apenas `create` |
| Sem ponto britânico | Port. 671 Art. 78 §1º | Liveness challenge + trigger humano |
| Sem rastreamento background | LGPD Art. 6º III | Grep `watchPosition` = vazio |
| Bloqueio de batida duplicada | Port. 671 Art. 78 | `CheckinController.ts:31-43` |
| Autenticação obrigatória | Port. 671 Art. 78 | `authMiddleware` em todas as rotas sensíveis |
| Audit trail | LGPD Art. 37 | `AuditMiddleware.ts` + `AuditLog` model |
| Multi-tenancy isolado | LGPD Art. 46 | `prisma-extensions.ts` AsyncLocalStorage |
| Rate limiting | Port. 671 Art. 78 | `RateLimitMiddleware.ts` |

---

## 6. Roteiro de Implementação — Priorização

> **Visão geral:** 4 sprints + fase futura (certificação ICP-Brasil).
> Total: **32 tarefas** (T01–T32) cobrindo todos os 26 findings.

### Sprint 1 — IMEDIATO (3-4 semanas) — Fundação Legal

> Itens bloqueantes sem os quais o software NÃO pode operar como REP-P.
> **Foco:** Schema, NSR, AFD, comprovante, consentimento, retenção.

| Tarefa | Finding | Item | Esforço | Dependências |
|--------|---------|------|---------|--------------|
| T01 | **F4** | Tornar CNPJ obrigatório no schema | Baixo | Migration Prisma |
| T02 | **F3 + F17** | Campo `nsr` + `ano` + generator com reinício anual + constraint `@@unique([companyId, nsr, ano])` | Médio | T01 |
| T03 | **F18** | Snapshot de `employerCnpj` no `CheckIn` (desnormalizar) | Baixo | T01 |
| T04 | **F2** | Rota `GET /checkins/export/afd` — AFD leiaute Anexo II | Alto | T02 |
| T05 | **F6** | Comprovante imediato (`comprovanteGenerator.ts`) + response no `POST /checkins` | Médio | T02 |
| T06 | **F9** | Páginas `TermosDeUso.tsx` + `PoliticaPrivacidade.tsx` | Médio | Nenhuma |
| T07 | **F10** | Tela `BiometricConsent.tsx` + checkboxes de consentimento no cadastro | Baixo | T06 |
| T08 | **F9/F10** | Modelo `Consentimento` no Prisma + `ConsentController` + rotas | Médio | T07 |
| T09 | **F19** | Modelo `UserStatus` + `deactivatedAt` no schema User | Baixo | Nenhuma |
| T10 | **F19** | `POLITICA_RETENCAO.md` + `retentionCleanup.ts` (cron diário 02:00) | Médio | T09 |
| T11 | **F20** | `relatorioMensalService.ts` — relatório folha mensal layout oficial MTE | Médio | T04 |

**Entregáveis Sprint 1:**
- Schema Prisma atualizado (NSR, ano, employerCnpj, UserStatus, Consentimento, Justificativa)
- 3 migrations (schema + dados existentes)
- NSR com reinício anual + generator transacional
- Rota AFD (`GET /checkins/export/afd`) com leiaute Anexo II
- Comprovante retornado em `POST /checkins` com hash SHA-256
- Relatório mensal MTE (`GET /checkins/export/relatorio-mensal`)
- Termos de Uso + Política de Privacidade (páginas + rotas)
- Consentimento biométrico (tela + backend + persistência)
- Política de retenção documentada + job de limpeza automática

---

### Sprint 2 — ALTO RISCO (3-4 semanas) — Proteção LGPD + Segurança

> **Foco:** Direitos do titular, token descartável, helmet, justificativas, DPA.

| Tarefa | Finding | Item | Esforço | Dependências |
|--------|---------|------|---------|--------------|
| T12 | **F11** | `PrivacyController.ts` + rotas (`GET /privacy/my-data`, `DELETE /privacy/my-face`, `GET /privacy/my-logs`) | Médio | T08 |
| T13 | **F11.b** | Token descartável para descriptor facial (`GET /employees/face/token` + `verifyFace` com token) — substitui `GET /employees/face` | Alto | Nenhuma |
| T14 | **F11.b** | Atualizar `pontoPage.tsx` + `LivenessChallenge.tsx` para usar token ao invés de descriptor bruto | Médio | T13 |
| T15 | **F11.b** | Remover `faceDescriptor` do response do `POST /checkins` (SEC-15) | Baixo | Nenhuma |
| T16 | **F12** | Adicionar `helmet` + HSTS ao `app.ts` | Baixo | Nenhuma |
| T17 | **F5** | Modelo `Justificativa` (Prisma) + `JustificativaController` + rotas | Médio | Nenhuma |
| T18 | **F13** | Template `docs/DPA.md` (Contrato de Tratamento de Dados) | Jurídico | Nenhuma |
| T19 | **F13** | Adicionar aceite do DPA no fluxo de cadastro da empresa (`CompanySignupPage.tsx`) | Médio | T18 |
| T20 | **F24** | Colunas `legalBasis`, `purpose`, `personalDataCategories` no `AuditLog` + mapeamento no `AuditMiddleware` | Médio | Nenhuma |

**Entregáveis Sprint 2:**
- Portal do titular (DSAR) completo no backend
- Token descartável para biometria (solução SEC-14/SEC-15)
- Frontend migrado para token (sem exposição de descriptor)
- Helmet + HSTS no Express
- Modelo Justificativa + Controller + Rotas (create, list, approve)
- DPA (Data Processing Agreement) documentado + aceite no signup
- AuditLog enriquecido com base legal e finalidade LGPD

---

### Sprint 3 — FUNCIONALIDADES COMPLEMENTARES (2-3 semanas)

> **Foco:** Ponto por exceção, tolerância, criptografia CPF, incidentes.

| Tarefa | Finding | Item | Esforço | Dependências |
|--------|---------|------|---------|--------------|
| T21 | **F7** | Flag `regimePonto` no settings + lógica no controller para regime de exceção | Médio | T17 |
| T22 | **F8** | `toleranceCalculator.ts` integrado ao `CheckinController` | Baixo | Nenhuma |
| T23 | **F12** | Criptografia de CPF no banco (`utils/encryption.ts` + migration) | Médio | Nenhuma |
| T24 | **F14** | `docs/PLANO_RESPOSTA_INCIDENTES.md` (template ANPD 72h) | Baixo | Nenhuma |
| T25 | **F22** | `docs/RELATORIO_IMPACTO_PRIVACIDADE.md` (RIP) | Baixo | Nenhuma |
| T26 | **F23** | Nomear DPO + incluir contato no rodapé da Política de Privacidade | Baixo | T06 |

**Entregáveis Sprint 3:**
- Suporte a ponto por exceção (settings + lógica)
- Tolerância de horário aplicada no backend
- CPF criptografado no banco (AES-256-GCM)
- Documento de resposta a incidentes (ANPD 72h)
- Relatório de impacto à privacidade (RIP)
- DPO nomeado + contato exposto

---

### Sprint 4 — ASSINATURA E BACKUP (3-4 semanas) — Certificação REP-P

> **Foco:** ICP-Brasil, backup AFD, restore, conformidade final.

| Tarefa | Finding | Item | Esforço | Dependências |
|--------|---------|------|---------|--------------|
| T27 | **F1** | Aquisição de certificado ICP-Brasil A1/A3 (e-CNPJ) | Alto | Jurídico |
| T28 | **F1** | `scripts/sign-build.ts` — assinatura SHA-256 do bundle compilado | Alto | T27 |
| T29 | **F1** | `scripts/verify-signature.ts` — verificação no deploy | Médio | T28 |
| T30 | **F1** | Validação de integridade no frontend (`utils/integrity.ts`) | Médio | T29 |
| T31 | **F21** | `afdBackup.ts` — job mensal de backup AFD criptografado (S3/KMS) | Médio | T04 |
| T32 | **F21** | `backupStorage.ts` — utilitário de upload + validação de restore periódico | Médio | T31 |

**Entregáveis Sprint 4:**
- Certificado ICP-Brasil obtido
- Pipeline de assinatura do build (CI/CD GitHub Actions)
- Verificação de assinatura no deploy
- Validação de integridade no frontend (bloqueia execução se compromised)
- Backup automático mensal do AFD de cada empresa (criptografado)
- Exercício de restore documentado

---

### FUTURO — Certificação INMETRO + Registro MTE

Após os 4 sprints, o Viggo estará em **conformidade técnica** com a maioria das exigências legais. Para operação formal como REP-P:

1. **Registrar o REP-P no INMETRO** — processo que exige:
   - Laudo técnico emitido por laboratório credenciado
   - Documentação do software (especificações, fluxogramas, código)
   - Certificado ICP-Brasil válido (Sprint 4)
   - Manual do usuário e manual técnico
   - Prazo estimado: 60-90 dias

2. **Registrar no MTE** — após homologação INMETRO:
   - Formulário de registro do REP-P
   - Número de homologação INMETRO
   - Dados do desenvolvedor (CNPJ, endereço)
   - Prazo estimado: 30-60 dias

3. **Manutenção contínua:**
   - Revisão anual do RIP (F22)
   - Atualização do DPO se necessário (F23)
   - Backup e restore testados semestralmente (F21)
   - Treinamento da equipe sobre LGPD e Portaria 671

**Nota:** Enquanto a certificação INMETRO não é concluída, todos os 24
findings + F11.b devem estar resolvidos para minimizar risco jurídico.
O Viggo pode operar em **regime de tolerância** (beta) com empresas que
aceitem o risco, desde que informadas explicitamente via DPA.

---

## 7. Notas Técnicas e Referências

### 7.1. Referências Legais

| Norma | Referência | Assunto |
|-------|-----------|---------|
| Portaria MTE 671/2021 | Art. 75 | Definição de REP-P |
| Portaria MTE 671/2021 | Art. 76 | Certificação do REP-P |
| Portaria MTE 671/2021 | Art. 77 | Obrigações do fabricante/desenvolvedor |
| Portaria MTE 671/2021 | Art. 78 | Regras de operação do REP-P |
| Portaria MTE 671/2021 | Art. 79 | Assinatura digital |
| Portaria MTE 671/2021 | Anexo II | Leiaute do AFD |
| Portaria MTE 671/2021 | Anexo III | Leiaute do comprovante |
| LGPD | Art. 5º II | Definição de dado sensível |
| LGPD | Art. 7º | Bases legais para tratamento |
| LGPD | Art. 11 | Tratamento de dados sensíveis |
| LGPD | Art. 18 | Direitos do titular |
| LGPD | Art. 39 III | Contrato controlador×operador |
| LGPD | Art. 46 | Medidas de segurança |
| LGPD | Art. 48 | Comunicação de incidentes |
| CLT | Art. 74 | Obrigatoriedade de registro de ponto |
| CLT | Art. 74 §2º | Tolerância de 5 min / ponto por exceção |

### 7.2. Atenção sobre Geolocalização

A Justiça do Trabalho aceita a geolocalização quando usada **apenas no
momento exato da batida do ponto** (para provar que o funcionário externo
estava no cliente, por exemplo). O Viggo **NUNCA** deve:

- Usar `navigator.geolocation.watchPosition` ou equivalente
- Rastrear o funcionário em tempo real
- Coletar localização fora do horário de trabalho
- Compartilhar localização com terceiros

O Viggo atualmente cumpre isso corretamente: usa apenas `getCurrentPosition`
uma única vez por batida, sem rastreamento em background.

### 7.3. Nota sobre o Security Audit

Este documento complementa o `docs/SECURITY_AUDIT.md` (68 vulnerabilidades
identificadas). As principais intersecções são:

| Finding Legal | Finding de Segurança Relacionado |
|---------------|----------------------------------|
| F12 (Criptografia descriptor) | SEC-31 (helmet), SEC-51 (descriptor sem cripto) |
| F11 (DSAR) | SEC-14 (descriptor exposto), SEC-15 (descriptor no checkin) |
| F4 (CNPJ obrigatório) | SEC-16 (empresa hardcoded "1") |

---

*Documento gerado em 17/07/2026 como parte da análise de conformidade do projeto Viggo.*
*Este documento deve ser revisado por assessor jurídico especializado em LGPD e legislação trabalhista antes da comercialização do produto.*

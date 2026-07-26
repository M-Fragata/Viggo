# Análise de Conformidade Legal — Projeto Viggo

**Data:** 17–23 de Julho de 2026
**Última revisão:** 26 de Julho de 2026
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
- **Proibição de edição/exclusão de batidas:** O `CheckinController.ts` expõe métodos
  de leitura (`index`, `listByCompany`, `listMonthly`) e criação (`createCheckin`), mas
  **não existem endpoints `PUT` ou `DELETE`** para registros de ponto, garantindo a
  integridade dos dados originais conforme Art. 78 da Portaria 671.
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

A análise identificou **32 findings** distribuídos entre as três normas (26 originais + 6 novas identificadas na revisão de 26/07/2026):

| Norma | Bloqueante | Alto Risco | Médio |
|-------|-----------|------------|-------|
| Portaria 671/2021 | 2 (F1, F21) | 1 (F7/F15) | 2 (F8/F16, F7 regime exceção) |
| LGPD | 4 (F9, F10, F11, F19) | 3 (F11.b, F12, F13) | 5 (F14, F22†, F23, F24, **G2, G4, G5, G10**) |
| CLT Art. 74 | 0 | 1 (F15/F7) | 1 (F16/F8) |
| **Total** | **6** | **5** | **5** |

**Total: 16 findings restantes — 6 bloqueantes, 5 alto, 5 médio**

> \* F22 (RIP) aplicável à Portaria por exigir registro de conformidade REP-P.
> † F22 (RIP) também aplicável à LGPD Art. 50 (Relatório de Impacto à Proteção de Dados).
> **G1–G10** = Novas lacunas identificadas na revisão de 26/07/2026 (ver seções detalhadas).

### Atualizações — 23/07/2026

Foram implementados 8 findings (Sprint 1) + 9 tarefas (Sprint 2) + 8 tarefas (Sprint 3):

#### Sprint 1 — Fundação Legal (Backend) — 11/11 ✅
| Finding | Descrição | Status |
|---------|-----------|--------|
| **F4** | CNPJ obrigatório no schema + validação no cadastro | ✅ Implementado |
| **F3/F17** | NSR sequencial com reinício anual + constraint `@@unique([companyId, nsr, ano])` + `NsrLimitExceededError` | ✅ Implementado |
| **F18** | Snapshot `employerCnpj` no `CheckIn` (desnormalizado) | ✅ Implementado |
| **F2** | Exportação AFD (Anexo II) — `GET /checkins/export/afd` com Header Tipo 1, Detalhes Tipo 2, Trailer Tipo 9 | ✅ Implementado |
| **F6** | Comprovante imediato (Anexo III) — `comprovanteGenerator.ts` com SHA-256, exibido no frontend | ✅ Implementado |
| **F9** | Termos de Uso + Política de Privacidade — páginas, checkbox cadastro, `Consentimento` model + `ConsentController` | ✅ Implementado |
| **F10** | Consentimento biométrico (Art. 11 LGPD) — checkbox específico + `Consentimento` model, salvo no signup | ✅ Implementado |
| **F19** | Política de retenção/deleção — `UserStatus`, `deactivatedAt`, `POLITICA_RETENCAO.md`, `retentionCleanup.ts` (cron 02:00) | ✅ Implementado |
| **F20** | Relatório mensal layout MTE — `relatorioMensalService.ts` + `GET /checkins/export/relatorio-mensal` com SHA-256 | ✅ Implementado |

#### Sprint 2 — Proteção LGPD + Segurança (Backend) — 9/9 ✅
| Finding | Descrição | Status |
|---------|-----------|--------|
| **F11** | Portal do Titular DSAR — `PrivacyController` + rotas (`GET /privacy/my-data`, `DELETE /privacy/my-face`, `GET /privacy/my-logs`) | ✅ Implementado |
| **F11.b** | Token descartável para descriptor facial — `GET /employees/face/token` + `verifyFace` com token | ✅ Implementado |
| **F12** | Helmet + HSTS no Express | ✅ Implementado |
| **F5** | Modelo `Justificativa` + `JustificativaController` + rotas (create, list, approve) | ✅ Implementado |
| **F13** | Template DPA (`docs/contrato-tratamento-dados.md`) + aceite no cadastro empresa | ✅ Implementado |
| **F24** | `AuditLog` enriquecido — colunas `legalBasis`, `purpose`, `personalDataCategories` + mapeamento automático no `AuditMiddleware` | ✅ Implementado |

#### Sprint 3 — Gaps Frontend + Documentos — 8/11 ✅
| Tarefa | Descrição | Status |
|--------|-----------|--------|
| **T24** | Plano de Resposta a Incidentes — `docs/PLANO_RESPOSTA_INCIDENTES.md` (template ANPD 72h) | ✅ Implementado |
| **T25** | Relatório de Impacto à Proteção de Dados — `docs/RELATORIO_IMPACTO_PRIVACIDADE.md` (RIP) | ✅ Implementado |
| **T26** | DPO — e-mail `dpo@viggo.com.br` no rodapé da Política de Privacidade | ✅ Implementado |
| **T27** | Portal LGPD do Funcionário (`/meus-dados`) — `MeusDadosPage.tsx` consumindo `/privacy/*` + `/consentimentos` | ✅ Implementado |
| **T28** | Tela de Justificativas — `JustificativasPage.tsx` adaptativa employee/admin (criar + listar/aprovar) | ✅ Implementado |
| **T29** | Botão "Exportar AFD" no Dashboard admin — `DashboardPage.tsx` | ✅ Implementado |
| **T30** | Dashboard de Consentimentos — integrado na seção "Consentimentos" do Portal LGPD (T27) | ⚠️ Parcial |
| **T31** | Lista de Funcionários — aba "Funcionários" no Dashboard com `api.employees.list()`, seletor de data, biometria e checkins | ✅ Implementado |

Migrations aplicadas: `f4_cnpj_obrigatorio`, `f3f17_nsr_anual`, `f18_employer_cnpj_snapshot`, `f9f10_consentimento`, `f19_user_status`.
Backend build: ✅ passando. Frontend build: ✅ passando.

> \* F22 (RIP) aplicável à Portaria por exigir registro de conformidade REP-P.
> † F22 (RIP) também aplicável à LGPD Art. 50 (Relatório de Impacto à Proteção de Dados).

> ⚠️ Os 6 findings bloqueantes restantes **impedem** o Viggo de operar como REP-P
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

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Impacto:** ~~Sem geração de AFD, o Viggo não fornece o arquivo obrigatório para
auditorias do MTE e para o eSocial (S-1200).~~ AFD agora é gerado via
`GET /checkins/export/afd` com leiaute Anexo II (pipe-separated).

**Implementação:**
- `backend/src/controller/AfdController.ts` — Novo controller com `exportAfd`
  - Header Tipo 1: CNPJ, IE, Razão Social, DataIni, DataFim
  - Detalhe Tipo 2: CNPJ, CPF, NSR, DataHora, Código (1-4)
  - Trailer Tipo 9: CNPJ, Total de registros
  - Usa `employerCnpj` snapshot do `CheckIn` (F18)
- `backend/src/routes/checkinRoutes.ts` — Rota `GET /export/afd` com `authMiddleware`
- `frontend/src/services/api.ts` — `checkins.exportAfd(startDate, endDate)` retorna `Blob`

**Arquivos afetados:**
- Novo: `backend/src/controller/AfdController.ts`
- Alterado: `backend/src/routes/checkinRoutes.ts`
- Alterado: `frontend/src/services/api.ts`

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

**Status:** ✅ IMPLEMENTADO (23/07/2026) — ver também F17 (reinício anual).

**Impacto:** ~~Sem NSR, o AFD é inválido.~~ NSR agora é gerado transacionalmente
por `getNextNSR(companyId, ano)` com `@@unique([companyId, nsr, ano])`.

**Implementação:**
- `schema.prisma:CheckIn` — campos `nsr Int` + `ano Int`, constraint `@@unique([companyId, nsr, ano])`
- `backend/src/utils/nsrGenerator.ts` — `getNextNSR(companyId, ano)` com limite 999.999/ano
- `CheckinController.createCheckin` — usa `extendedPrisma.$transaction` para NSR atômico + create
- `NsrLimitExceededError` customizado em `backend/src/utils/errors/`
- Migration: `20260723130000_f3f17_nsr_anual`

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma`
- Novo: `backend/src/utils/nsrGenerator.ts`
- Alterado: `backend/src/controller/CheckinController.ts`

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

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Impacto:** ~~O campo `Company.cnpj` no schema (`schema.prisma:12`) é `String?`
(opcional).~~ CNPJ agora é `String @unique` obrigatório, validado no cadastro.

**Implementação:**
- `schema.prisma:12` — `cnpj String @unique` (era `String?`)
- `CompanyController.ts` — Zod `.string().min(14, "CNPJ é obrigatório")`, formatado com `formatCnpjToNumeric`, sempre salva
- Frontend: `companySignup.ts` `.min(14)`, `CompanySignupPage.tsx` label sem "(opcional)"
- `api.ts` — tipos `cnpj: string` (era `string | null`)
- Migration: `20260723120000_f4_cnpj_obrigatorio`

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma:12`
- Alterado: `backend/src/controller/company/CompanyController.ts`
- Alterado: `frontend/src/schemas/companySignup.ts`
- Alterado: `frontend/src/pages/CompanySignupPage.tsx`
- Alterado: `frontend/src/services/api.ts`
- Alterado: `frontend/src/pages/CompanyManagePage.tsx`
- Alterado: `frontend/src/pages/MasterCompanies.tsx`

---

#### F5. AUSÊNCIA DE JUSTIFICATIVA PARA MARCAÇÕES — BLOQUEANTE

> **Art. 78, §1º:** "É vedado ao REP-P limitar a realização de marcações de ponto
> pelo empregado, que deverá ser feita a qualquer tempo, salvo quando houver
> registro de Justificativa."

> **Art. 78, §5º, VIII:** "Justificativa para marcação de ponto, quando aplicável."

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Impacto:** ~~Sem funcionalidade de justificativa, o sistema não permite ao empregado
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

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Impacto:** ~~A tela `pontoPage.tsx:300-313` mostra "Ponto Concluído!" com a hora atual,
mas não gera comprovante formal.~~ Comprovante agora é gerado com hash SHA-256 e
exibido ao funcionário imediatamente após cada marcação.

**Implementação:**
- `backend/src/utils/comprovanteGenerator.ts` — gera comprovante texto (Anexo III)
  com campos: Empregador, CNPJ, Empregado, CPF, Data, Hora, Tipo, NSR, Localização
  + hash SHA-256 para verificação de integridade
- `CheckinController.createCheckin` — busca `company.name`, gera comprovante,
  retorna `{ checkin, comprovante, hashVerificacao }` (removeu `faceDescriptor`)
- `pontoPage.tsx` — exibe comprovante em `<pre>` dentro do overlay de sucesso
- `api.ts` — novo tipo `CheckinCreateResponse` com `comprovante` e `hashVerificacao`

**Arquivos afetados:**
- Novo: `backend/src/utils/comprovanteGenerator.ts`
- Alterado: `backend/src/controller/CheckinController.ts` — gera + retorna comprovante
- Alterado: `frontend/src/pages/pontoPage.tsx` — exibe comprovante no sucesso
- Alterado: `frontend/src/services/api.ts` — tipo `CheckinCreateResponse`

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

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Implementação:**
- `frontend/src/pages/TermosDeUso.tsx` — página de texto com 9 seções (objeto, aceitação, serviço, obrigações, propriedade, disponibilidade, responsabilidade, rescisão, foro)
- `frontend/src/pages/PoliticaPrivacidade.tsx` — página com 12 seções (controlador, dados, finalidade, base legal, compartilhamento, segurança, retenção, direitos titular, biometria, incidentes, DPO, alterações)
- `frontend/src/routes/AuthRoutes.tsx` — rotas `/termos-de-uso` e `/politica-privacidade`
- `frontend/src/pages/CompanySignupPage.tsx` — 2 checkboxes obrigatórios com links para as páginas
- `frontend/src/schemas/companySignup.ts` — `aceiteTermos` e `aceiteBiometria` com `z.boolean().refine()`
- `backend/prisma/schema.prisma` — modelo `Consentimento` com `@@unique([userId, tipo, versao])`
- `backend/src/controller/ConsentController.ts` — `create` (upsert) + `list` por usuário
- `backend/src/routes/consentRoutes.ts` — `POST /consentimentos` + `GET /consentimentos`
- `backend/src/routes/index.ts` — rota `/consentimentos` registrada
- `backend/src/controller/company/CompanyController.ts` — salva 3 consentimentos no signup (Termos, Política, Biometria)
- Migration: `20260723150000_f9f10_consentimento`

**Arquivos afetados:**
- Novo: `frontend/src/pages/TermosDeUso.tsx`
- Novo: `frontend/src/pages/PoliticaPrivacidade.tsx`
- Novo: `backend/src/controller/ConsentController.ts`
- Novo: `backend/src/routes/consentRoutes.ts`
- Alterado: `frontend/src/routes/AuthRoutes.tsx`
- Alterado: `frontend/src/pages/CompanySignupPage.tsx`
- Alterado: `frontend/src/schemas/companySignup.ts`
- Alterado: `frontend/src/services/api.ts`
- Alterado: `backend/prisma/schema.prisma`
- Alterado: `backend/src/controller/company/CompanyController.ts`
- Alterado: `backend/src/routes/index.ts`

---

#### F10. CONSENTIMENTO ESPECÍFICO PARA BIOMETRIA (DADO SENSÍVEL) — BLOQUEANTE LGPD

> **Art. 11:** "O tratamento de dados pessoais sensíveis somente poderá
> ocorrer nas seguintes hipóteses: I — quando o titular ou seu representante
> legal consentir, de forma específica e destacada."
>
> **Art. 11, §1º:** "O consentimento referido ao inciso I deste artigo
> deverá ser fornecido por escrito ou por outro meio que demonstre a
> manifestação de vontade do titular."

**Status:** ✅ IMPLEMENTADO (23/07/2026) — implementado junto com F9.

**Implementação:**
- Checkbox separado e destacado no cadastro: "Autorizo expressamente o uso da minha biometria facial"
- Modelo `Consentimento` com tipo `BIOMETRIA`, versão `1.0`, registro no signup
- `ConsentController` permite consulta futura dos consentimentos (Art. 18 LGPD)
- IP do titular registrado para evidência de consentimento

**Arquivos afetados:** Implementados conjuntamente com F9 (ver acima).

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

**Status:** IMPLEMENTADO ✅

**Implementação:**
- `backend/src/controller/PrivacyController.ts` — 3 endpoints DSAR:
  - `GET /privacy/my-data` — dados pessoais, biométricos, checkins, consentimentos
  - `DELETE /privacy/my-face` — remove descriptor facial + revoga consentimento biométrico
  - `GET /privacy/my-logs` — 50 últimos logs de auditoria do usuário
- `backend/src/routes/privacyRoutes.ts` — rotas com `authMiddleware`
- `backend/src/routes/index.ts` — rota `/privacy` registrada

**Arquivos afetados:**
- Novo: `backend/src/controller/PrivacyController.ts`
- Novo: `backend/src/routes/privacyRoutes.ts`
- Alterado: `backend/src/routes/index.ts`

---

#### F11.b. DESCRIPTOR FACIAL EXPOSTO VIA GET /employees/face — SOLUÇÃO TOKEN DESCARTÁVEL

> **Art. 18, II (acesso) c/c Art. 46 (segurança):** Mesmo quando o titular
> solicita "acesso" aos dados, o controlador **não deve** devolver dados
> sensíveis que possam ser usados para reoferecer consentimentoabolicamente
> (como o vetor biométrico). Deve-se confirmar **existência** e **finalidade**,
> não expor o vetor.

**Status:** IMPLEMENTADO ✅

**Implementação:**
- `backend/src/controller/EmployeesController.ts`:
  - `issueFaceToken()` — gera token UUID com TTL 30s, armazena descriptor em Map em memória
  - `verifyFace()` — aceita `{ token, descriptor }` (modo novo) ou `{ descriptor }` (legado)
  - `GET /employees/face` removido (não expõe mais descriptor ao client)
- `backend/src/routes/employeesRoutes.ts` — `GET /face/token` + `POST /face/verify`
- `frontend/src/services/api.ts` — `issueFaceToken()` + `verifyFaceWithToken(token, descriptor)`, removido `getFaceDescriptor()`
- `frontend/src/pages/pontoPage.tsx` — usa `issueFaceToken()` em vez de `getFaceDescriptor()`, passa `faceToken` ao LivenessChallenge
- `frontend/src/components/LivenessChallenge.tsx` — recebe `faceToken`, envia `{ token, descriptor }` para verify, sem `fallbackLocalComparison`
- `POST /checkins` response — `faceDescriptor` já removido (implementado no F6)

**Arquivos afetados:**
- Alterado: `backend/src/controller/EmployeesController.ts`
- Alterado: `backend/src/routes/employeesRoutes.ts`
- Alterado: `frontend/src/services/api.ts`
- Alterado: `frontend/src/pages/pontoPage.tsx`
- Alterado: `frontend/src/components/LivenessChallenge.tsx`

---

> **Nota sobre correlação:** Esta solução resolve simultaneamente as pendências
> **SEC-14**, **SEC-15** e **SEC-51** do `docs/SECURITY_AUDIT.md`.

---

#### F12. DESCRIPTOR FACIAL SEM CRIPTOGRAFIA EM TRÂNSITO — RISCO ALTO LGPD

> **Art. 46:** "Os agentes de tratamento devem adotar medidas de segurança,
> técnicas e administrativas aptas a proteger os dados pessoais de acessos
> não autorizados e de situações acidentais ou ilícitas de destruição, perda,
> alteração, comunicação ou qualquer forma de tratamento inadequado ou ilícito."

**Status:** IMPLEMENTADO ✅ (Helmet + HSTS)

**Impacto:** ~~O `faceDescriptor` (128 floats) é enviado em texto plano via
HTTPS. Sem HTTPS forçado + HSTS, o descriptor pode ser interceptado.~~
Helmet + HSTS agora protegem todas as respostas HTTP com headers de
segurança (HSTS 1 ano, CSP, X-Frame-Options, etc).

**Implementação:**
- `backend/src/app.ts` — `helmet()` com HSTS (1 ano, includeSubDomains, preload) + CSP (defaultSrc self, scriptSrc self, styleSrc self+unsafe-inline, imgSrc self+data)
- `backend/package.json` — `helmet` + `@types/helmet`

**Arquivos afetados:**
- Alterado: `backend/package.json`
- Alterado: `backend/src/app.ts`
- Alterado: `backend/src/routes/checkinRoutes.ts`
- Alterado: `frontend/src/services/api.ts` — `checkins.exportRelatorioMensal()`
- Alterado: `frontend/src/pages/DashboardPage.tsx` — Botão download (substitui geração client-side)

---

#### F13. CONTRATO CONTROLADOR × OPERADOR (SAAS MULTITENANT) — RISCO ALTO LGPD

> **Art. 39, III:** "As atividades de tratamento de dados pessoais
> [...] deverão ser determinadas por meio de contrato [...] entre o
> controlador e o operador."

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Constatado:** ~~O Viggo opera como **operador** de dados (processa dados em
nome das empresas clientes, que são controladoras). Sem contrato de
tratamento entre Viggo e cada empresa, viola Art. 39 da LGPD.~~

**Implementado:** Template de DPA criado em `docs/contrato-tratamento-dados.md`.
Checkbox de aceite adicionado ao fluxo de cadastro da empresa.
Consentimento do tipo `DPA` salvo no banco junto aos demais consentimentos.

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

**Status:** ✅ IMPLEMENTADO (24/07/2026) — `backend/docs/PLANO_RESPOSTA_INCIDENTES.md` (T24)

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

**Status:** ✅ IMPLEMENTADO (23/07/2026) — implementado junto com F3.

**Impacto:** ~~Se o NSR não reiniciar em 1º de janeiro, ao longo do ano uma
empresa grande pode ultrapassar o limite de 999.999 registros, gerando AFD
inválido.~~ NSR agora filtra por `ano` corrente e reinicia automaticamente.

**Implementação:**
- `nsrGenerator.ts` — filtra checkins por `ano` corrente, limite 999.999
- `NsrLimitExceededError` — erro específico quando limite é atingido
- `schema.prisma` — `ano Int` em `CheckIn` + `@@unique([companyId, nsr, ano])`
- Migration: `20260723130000_f3f17_nsr_anual`

**Arquivos afetados:**
- Alterado: `backend/src/utils/nsrGenerator.ts`
- Alterado: `backend/prisma/schema.prisma`

---

#### F18. IDENTIFICAÇÃO DO EMPREGADOR MATERIALIZADA NO REGISTRO DE PONTO — ALTO

> **Art. 78, §5º-A, II, da Portaria 671/2021:** Cada registro no AFD deve
> conter a "identificação do empregador (CNPJ ou CPF)".

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Impacto:** ~~No schema atual, a identificação do empregador está apenas na
tabela `Company` via `companyId` (relacionamento). Se uma empresa alterar
CNPJ (incorporação, cisão, mudança de razão social) os registros antigos
do `CheckIn` ficam com referência histórica inválida.~~ CNPJ agora é
snapshot imutável no `CheckIn.employerCnpj`.

**Implementação:**
- `schema.prisma:CheckIn` — campo `employerCnpj String` NOT NULL
- `CheckinController.createCheckin` — busca `company.cnpj` antes do create, salva como snapshot imutável
- AFD usa `checkin.employerCnpj` em vez de buscar `Company.cnpj` em runtime
- Migration: `20260723140000_f18_employer_cnpj_snapshot`

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma`
- Alterado: `backend/src/controller/CheckinController.ts`
- Alterado: `backend/src/controller/AfdController.ts` (usa `checkin.employerCnpj`)

---

#### F19. AUSÊNCIA DE POLÍTICA DE RETENÇÃO E ELIMINAÇÃO DE DADOS — BLOQUEANTE LGPD

> **Art. 15, LGPD:** "A eliminação de dados pessoais, quando atendida a
> finalidade ou expirado o prazo de tratamento (...) deve ser feita a partir
> de política de retenção e descarte."
>
> **Art. 16, LGPD:** "Os dados devem ser eliminados após o término do
> tratamento, ressalvadas as hipóteses de manutenção previstas em lei."

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Implementação:**
- `backend/prisma/schema.prisma` — `enum UserStatus { ACTIVE; INACTIVE }` + campos `status` e `deactivatedAt` no `User`
- `backend/docs/POLITICA_RETENCAO.md` — documento formal com tabela de prazos, regras de eliminação, base legal
- `backend/src/scripts/retentionCleanup.ts` — job que:
  - Remove `faceDescriptor` de usuários INACTIVE há >30 dias
  - Deleta `CheckIn` com >5 anos (CLT Art. 74 §4º)
  - Deleta `InviteToken` revogados há >90 dias
  - Gera log estruturado JSON com métricas
- `backend/src/server.ts` — cron schedule `0 2 * * *` via `node-cron`
- `backend/package.json` — `node-cron` + `@types/node-cron`
- Migration: `20260723160000_f19_user_status`

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma`
- Alterado: `backend/src/server.ts`
- Alterado: `backend/package.json`
- Novo: `backend/docs/POLITICA_RETENCAO.md`
- Novo: `backend/src/scripts/retentionCleanup.ts`
- Novo: `backend/prisma/migrations/20260723160000_f19_user_status/`

---

#### F20. AUSÊNCIA DE RELATÓRIO MENSAL NO LAYOUT OFICIAL MTE — ALTO

> **Art. 78, §5º-A, V, da Portaria 671/2021:** "O REP-P deverá gerar, a
> partir do AFD, relatórios periódicos contendo(...) folha mensal de
> ponto, conforme modelo aprovado pelo MTE."

**Status:** IMPLEMENTADO ✅

**Constatado:** `CheckinController.listMonthly` (`CheckinController.ts:182-239`)
gera um JSON com agrupamento por employeeId. `DashboardPage.tsx:320-365`
gera tabela HTML para impressão. **Nenhum dos dois segue o modelo oficial
do MTE** (relatório folha mensal com colunas: dia, Entrada, Saída intervalo,
Retorno intervalo, Saída, Observação, Assinatura — com hash SHA-256 no rodapé).

**Solução implementada:**

- `backend/src/services/relatorioMensalService.ts` — gera CSV com layout oficial MTE (Empregador, CNPJ, Período, Funcionário, CPF + colunas Dia|Sem|Entrada|Saída Intervalo|Retorno Intervalo|Saída|Observação + ASSINATURA + HASH SHA-256)
- `CheckinController.exportRelatorioMensal` — endpoint `GET /checkins/export/relatorio-mensal?year=&month=`
- `frontend/src/services/api.ts` — `checkins.exportRelatorioMensal()`
- `frontend/src/pages/DashboardPage.tsx` — botão "Exportar Relatório" no tab Folha Mensal (substitui impressão client-side)

**Rota:** `GET /checkins/export/relatorio-mensal?year=&month=`

**Arquivos afetados:**
- Novo: `backend/src/services/relatorioMensalService.ts`
- Alterado: `backend/src/routes/checkinRoutes.ts`
- Alterado: `backend/src/controller/CheckinController.ts` — Novo endpoint de exportação
- Alterado: `frontend/src/services/api.ts` — `checkins.exportRelatorioMensal()`
- Alterado: `frontend/src/pages/DashboardPage.tsx` — Botão download (substitui geração client-side)

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

**Status:** ✅ IMPLEMENTADO (24/07/2026) — `backend/docs/RELATORIO_IMPACTO_PRIVACIDADE.md` (T25)

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

**Status:** ✅ IMPLEMENTADO (24/07/2026) — e-mail `dpo@viggo.com.br` no rodapé da Política de Privacidade (T26)

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

**Status:** ✅ IMPLEMENTADO (23/07/2026)

**Constatado:** ~~O `AuditMiddleware.ts` já registra `AuditLog` no banco
(action, entity, userId, ip, userAgent, timestamp). Porém, **não há
mapeamento explícito** desses logs para os "tratamentos" LGPD (cada
ação deve ser legível como "finalidade"). O campo `action` tem valores
como `CHECKIN`, `FACE_VALIDATION` — não há documentação que diga
qual **base legal** está associada a cada um.~~

**Implementado:** Colunas `legalBasis`, `purpose` e `personalDataCategories`
adicionadas ao schema `AuditLog`. `AuditMiddleware` mapeia automaticamente
base legal, finalidade e categorias de dados para cada ação auditada.
`PrivacyController` retorna os novos campos nos logs do titular (DSAR).

> **Nota adicional:** Campos `oldData` e `newData` do schema existem
> mas são sempre gravados como `null` pelo middleware (`AuditMiddleware.ts:71-72`),
> ou seja, a trilha de auditoria registra **apenas a ocorrência** da ação,
> sem capturar payload anterior/novo — limitando severamente a utilidade
> forense do `AuditLog`.

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

## 4.2. Novas Lacunas Identificadas na Revisão de 26/07/2026

> As lacunas G1–G10 abaixo foram identificadas durante a revisão completa do código em 26/07/2026. Elas **não constavam** na versão original do documento (17/07/2026) e representam riscos jurídicos adicionais.

---

#### G1. FACE DESCRIPTOR EM TEXTO PLANO NO BANCO — ALTO LGPD

> **Art. 46 LGPD:** "Os agentes de tratamento devem adotar medidas de segurança, técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou qualquer forma de tratamento inadequado ou ilícito."

**Status:** ✅ IMPLEMENTADO (26/07/2026) — T40

**Impacto:** O `User.faceDescriptor` (vetor de 128 floats) é armazenado em `Json` no PostgreSQL **sem criptografia**. Em caso de vazamento do banco de dados, o vetor biométrico de todos os funcionários fica exposto. Diferente de imagem facial, o descriptor permite reidenticação e ataques de dicionário biométrico.

**Análise técnica atual:**
- `schema.prisma:35` — `faceDescriptor Json?` (texto plano)
- `LivenessChallenge.tsx` envia descriptor → `EmployeesController.verifyFaceWithToken` valida
- Descriptor nunca criptografado em repouso

**Solução proposta:**

1. **Criptografar `faceDescriptor` em repouso** (AES-256-GCM com nonce aleatório):
   - Novo campo `faceDescriptorEncrypted` (Text) + `faceDescriptorNonce` (Text)
   - Remover campo `faceDescriptor` ou manter apenas durante migração
   - Chave derivada de `FACE_ENCRYPTION_KEY` (env var, 32 bytes hex)

2. **Utilitários em `backend/src/utils/faceEncryption.ts`:**
   - `encryptDescriptor(descriptor: Float32Array): { encrypted: string; nonce: string }`
   - `decryptDescriptor(encrypted: string, nonce: string): Float32Array`

3. **Atualizar `EmployeesController`:**
   - `registerFaceDescriptor` → criptografa antes de salvar
   - `verifyFace` → descriptografa para comparação (apenas no servidor)

4. **Migração Prisma:** Backfill dos descriptors existentes

**Arquivos afetados:**
- Novo: `backend/src/utils/faceEncryption.ts`
- Alterado: `backend/prisma/schema.prisma` (User model)
- Alterado: `backend/src/controller/EmployeesController.ts`
- Alterado: `backend/src/controller/PrivacyController.ts` (DSAR descriptografa para exibir dimensão)
- Migration: nova

---

#### G2. DSAR INCOMPLETO — SEM PORTABILIDADE (ART. 18 V) NEM CORREÇÃO (ART. 18 III) — MÉDIO LGPD

> **Art. 18 LGPD:** "O titular dos dados pessoais tem direito a obter do controlador [...] V — portabilidade dos dados a outro fornecedor de serviço ou produto, mediante requisição expressa [...] III — correção de dados incompletos, inexatos ou desatualizados."

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** `PrivacyController` implementa `GET /my-data` (acesso) e `DELETE /my-face` (eliminação/revogação), mas **faltam**:
- `PUT /privacy/my-data` — correção de dados (nome, email, etc.)
- `GET /privacy/export` — portabilidade em formato estruturado (JSON/CSV)

**Solução proposta:**

1. **Adicionar endpoints no `PrivacyController`:**
   - `PUT /privacy/my-data` — atualiza campos permitidos (name, email), valida Zod, registra audit log com `legalBasis: "Art. 18, III — Correção"`
   - `GET /privacy/export` — retorna todos os dados do titular em JSON estruturado + opção CSV, registra audit log com `legalBasis: "Art. 18, V — Portabilidade"`

2. **Frontend:** Botões "Corrigir meus dados" e "Exportar todos os dados" no `MeusDadosPage.tsx`

**Arquivos afetados:**
- Alterado: `backend/src/controller/PrivacyController.ts`
- Alterado: `backend/src/routes/privacyRoutes.ts`
- Alterado: `frontend/src/pages/MeusDadosPage.tsx`
- Alterado: `frontend/src/services/api.ts`

---

#### G3. CONVITE DE FUNCIONÁRIO SEM CONSENTIMENTO LGPD — BLOQUEANTE LGPD

> **Art. 7º LGPD:** "O tratamento de dados pessoais somente poderá ser realizado [...] IV — mediante fornecimento de dados pessoais pelo titular ou seu representante no ato de sua cessão."
>
> **Art. 11 LGPD:** Consentimento específico e destacado para dados sensíveis (biometria).

**Status:** ✅ IMPLEMENTADO (26/07/2026) — T38

**Impacto:** Fluxo de **convite de funcionário** (`AcceptInvitePage.tsx` + `CompanyController.acceptInvite`) cria usuário `EMPLOYEE` **sem coletar nenhum consentimento** (Termos de Uso, Política de Privacidade, Biometria, DPA). Funcionários onboarded via convite não têm registros em `Consentimento` → violação direta Arts. 7º e 11 LGPD.

**Análise técnica atual:**
- `CompanyController.acceptInvite` (linhas 533-645): cria user com name, email, password, role, companyId — **zero consentimentos**
- `AcceptInvitePage.tsx`: formulário apenas email, name, password, confirmPassword
- `CompanyController.signup` (empresa) **salva 4 consentimentos** (linhas 115-120) — mas `acceptInvite` não

**Solução proposta:**

1. **Backend — `CompanyController.acceptInvite`:** Após criar user, criar 4 `Consentimento` records:
   ```typescript
   const consentimentos = [
     { userId: user.id, tipo: "TERMOS_DE_USO", versao: "1.0", aceite: true, ip },
     { userId: user.id, tipo: "POLITICA_PRIVACIDADE", versao: "1.0", aceite: true, ip },
     { userId: user.id, tipo: "BIOMETRIA", versao: "1.0", aceite: true, ip }, // funcionário autoriza ao aceitar convite
     { userId: user.id, tipo: "DPA", versao: "1.0", aceite: true, ip },
   ];
   await tx.consentimento.createMany({ data: consentimentos });
   ```

2. **Frontend — `AcceptInvitePage.tsx`:** Adicionar 4 checkboxes obrigatórios idênticos ao `CompanySignupPage.tsx` (linhas 272-336), com links para Termos, Privacidade, Biometria (Art. 11), DPA.

3. **Validação Zod:** Adicionar `aceiteTermos`, `aceiteBiometria`, `aceiteDpa`, `aceitePrivacidade` no schema do invite.

**Arquivos afetados:**
- Alterado: `backend/src/controller/company/CompanyController.ts` (método `acceptInvite`)
- Alterado: `frontend/src/components/company/AcceptInvitePage.tsx`
- Alterado: `frontend/src/schemas/companySignup.ts` (reutilizar validação)

---

#### G4. AUDITLOG.OLDATA/NEWDATA SEMPRE NULL — MÉDIO LGPD

> **Art. 37 LGPD:** Registro de operações de tratamento deve permitir rastreabilidade.

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** `AuditMiddleware.ts:155-156` grava `oldData: null` e `newData: null` para todas as ações. A trilha de auditoria registra **apenas a ocorrência** da ação, sem capturar payload anterior/novo — limitando severamente a utilidade forense e a capacidade de demonstrar conformidade à ANPD.

**Análise técnica atual:**
- `AuditMiddleware` captura apenas `action`, `entity`, `entityId`, `legalBasis`, `purpose`, `categories`
- Em UPDATE/DELETE, não há snapshot do estado anterior/próximo

**Solução proposta:**

1. **No middleware:** Antes de chamar `next()`, clonar `req.body` (para CREATE/UPDATE) e buscar estado atual do banco (para UPDATE/DELETE) → salvar em `oldData`/`newData`
2. **Cuidado com PII:** Mascarar campos sensíveis (`cpf`, `faceDescriptor`, `password`) nos logs
3. **Performance:** Fazer de forma assíncrona (não bloquear response)

**Arquivos afetados:**
- Alterado: `backend/src/middleware/AuditMiddleware.ts`

---

#### G5. AUDIT MIDDLEWARE NÃO GLOBAL — MÉDIO LGPD

> **Art. 37 LGPD:** Registro deve cobrir todas as operações de tratamento.

**Status:** PARCIALMENTE IMPLEMENTADO

**Impacto:** `auditMiddleware` aplicado **apenas** em `checkinRoutes.ts` (`POST /checkins`). Rotas sensíveis **não auditadas automaticamente**:
- `/consentimentos` (POST, GET)
- `/justificativas` (POST, GET, PUT)
- `/employees/face/token` (GET)
- `/employees/face/verify` (POST)
- `/checkins/export/*` (GET)
- `/master/companies/*/impersonate` (POST)
- `/privacy/*` (GET, DELETE)

**Solução proposta:**

1. Registrar `auditMiddleware` **globalmente** em `app.ts` (após `authMiddleware` para ter `req.user`)
2. Ou aplicar individualmente em todas as rotas sensíveis via `index.ts`
3. Ajustar `getActionFromRequest` para cobrir todos os endpoints

**Arquivos afetados:**
- Alterado: `backend/src/app.ts` (registro global)
- Alterado: `backend/src/middleware/AuditMiddleware.ts` (mapeamento expandido)
- Alterado: `backend/src/routes/index.ts` (se não global)

---

#### G6. CPF CRIPTOGRAFIA AES-CBC DETERMINÍSTICO — MÉDIO LGPD

> **Art. 46 LGPD:** Medidas de segurança técnicas adequadas.

**Status:** ✅ IMPLEMENTADO (26/07/2026) — T43

**Impacto:** `cpfEncryption.ts` usa **AES-256-CBC com IV determinístico** (derivado do próprio CPF via SHA-256). Mesmo CPF → mesmo ciphertext. Permite:
- Ver duplicatas no banco (mesmo ciphertext = mesmo CPF)
- Ataque de dicionário se atacante tem acesso ao DB + sabe algoritmo

**Solução proposta (migração para AES-GCM):**

1. **Nova coluna `cpfHash`** (String, `@unique`) — SHA-256(CPF + pepper) para lookup único
2. **Campo `cpf`** criptografado com **AES-256-GCM + nonce aleatório** (12 bytes) por registro
3. **Busca por CPF:** hash input → buscar por `cpfHash` → descriptografar `cpf` do registro encontrado
4. **Pepper** armazenado em env var (`CPF_HASH_PEPPER`) — não no banco

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma` (User: add `cpfHash String @unique`)
- Alterado: `backend/src/utils/cpfEncryption.ts` (reimplementar AES-GCM + hash)
- Alterado: `backend/src/controller/CompanyController.ts` (signup + invite accept)
- Alterado: `backend/src/controller/AfdController.ts`, `PrivacyController.ts`, `CheckinController.ts`, `relatorioMensalService.ts`
- Migration: backfill `cpfHash` para registros existentes

---

#### G7. USUÁRIOS ATIVOS: FACEDESCRIPTOR SEM EXPIRAÇÃO — MÉDIO LGPD

> **Art. 15 LGPD:** "A eliminação de dados pessoais [...] deve ser feita a partir de política de retenção e descarte."

**Status:** NÃO IMPLEMENTADO

**Impacto:** `retentionCleanup.ts` só remove `faceDescriptor` de usuários `INACTIVE` > 30 dias. Usuários **ATIVOS** mantêm descriptor **indefinidamente** — sem política de revalidação periódica (ex.: a cada 2 anos). Viola princípio de minimização e retenção por tempo necessário.

**Solução proposta:**

1. **Adicionar campo `faceDescriptorUpdatedAt`** no `User` (DateTime)
2. **Job mensal** (no `retentionCleanup.ts` ou novo script): usuários ATIVOS com `faceDescriptorUpdatedAt` > 2 anos → setar `faceDescriptor = NULL` + upsert `Consentimento BIOMETRIA = false` + notificar funcionário
3. **Frontend:** Ao tentar bater ponto sem descriptor → redirect para `/register` com aviso "Sua biometria expirou, recadastre-se"

**Arquivos afetados:**
- Alterado: `backend/prisma/schema.prisma` (User: add `faceDescriptorUpdatedAt`)
- Alterado: `backend/src/scripts/retentionCleanup.ts` (nova lógica)
- Alterado: `backend/src/controller/EmployeesController.ts` (atualiza timestamp no register)
- Alterado: `frontend/src/pages/pontoPage.tsx` / `RegisterFace.tsx` (mensagem expiração)

---

#### G8. LEGACY SESSIONCONTROLLER COM COMPANYID HARDCODED — BAIXO MULTI-TENANCY

> **Portaria 671 multi-tenancy:** Isolamento de dados entre empresas.

**Status:** ✅ IMPLEMENTADO (26/07/2026) — T39 — rota `POST /sessions` removida

**Impacto:** `SessionController.create` (linhas 13-64) cria usuário na empresa `id: "1"` hardcoded. Rota de teste que **vaza multi-tenancy** — permite criar usuários fora do fluxo de convite/signup, sem consentimentos, sem validação de plano.

**Solução proposta:**
1. **Remover rota** `POST /sessions` (legado) — não usada em produção
2. Ou proteger com `requireMaster` + aviso "apenas para testes"

**Arquivos afetados:**
- Alterado: `backend/src/controller/SessionController.ts`
- Alterado: `backend/src/routes/sessionRoutes.ts`

---

#### G9. MIGRAÇÃO DE ROLES COM CAMPO INEXISTENTE — BAIXO

**Status:** ✅ IMPLEMENTADO (26/07/2026) — T46 — script removido

**Impacto:** `scripts/migrate-roles.ts:38` referencia `enterpriseId` que **não existe** no schema atual. Script falharia se executado.

**Solução proposta:** Remover ou corrigir script (já executado manualmente via SQL?).

**Arquivos afetados:**
- Alterado: `backend/src/scripts/migrate-roles.ts`

---

#### G10. TESTES AUTOMATIZADOS AUSENTES — MÉDIO BOA PRÁTICA / AUDITORIA

**Status:** NÃO IMPLEMENTADO

**Impacto:** `backend/src/test/setup.ts` **inteiramente comentado**; `vitest` não instalado; nenhum teste unitário/integração roda no CI. Sem testes, regressões em conformidade (ex.: remoção acidental de consentimento no invite) não são detectadas.

**Solução proposta:**
1. Instalar `vitest`, `@vitest/coverage-v8`, `supertest`
2. Configurar `vitest.config.ts` com `environment: node`, `globals: true`
3. Testes mínimos obrigatórios:
   - `CheckinController.createCheckin` → gera NSR, comprovante, tolerância
   - `CompanyController.signup` + `acceptInvite` → salvam 4 consentimentos
   - `PrivacyController` → DSAR retorna dados corretos
   - `AuditMiddleware` → mapeia legalBasis correto
   - `toleranceCalculator` → casos limite (adiantamento, tolerância, excesso)
4. CI: `npm run test` no pipeline GitHub Actions

**Arquivos afetados:**
- Novo: `backend/vitest.config.ts`
- Novo: `backend/src/test/*.test.ts` (mínimo 10 arquivos)
- Alterado: `backend/package.json` (scripts + deps)

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
| F2 | Geração AFD | Art. 78 §5º | ✅ | 🔴 Bloqueante | `AfdController.ts` |
| F3 | NSR sequencial | Art. 78 §5º III | ✅ | 🔴 Bloqueante | `nsrGenerator.ts` |
| F4 | CNPJ obrigatório | Art. 78 §5º II | ✅ | 🔴 Bloqueante | `schema.prisma:12` |
| F5 | Justificativa | Art. 78 §1º | ✅ | 🔴 Bloqueante | `JustificativaController.ts` |
| F6 | Comprovante imediato | Art. 78 §2º | ✅ | 🔴 Bloqueante | `comprovanteGenerator.ts` |
| F17 | NSR reinicia anualmente | Art. 78 §5º-C | ✅ | 🔴 Bloqueante | `nsrGenerator.ts` |
| F18 | Identif. empregador no registro | Art. 78 §5º-A II | ✅ | 🟠 Alto | `CheckIn.employerCnpj` |
| F20 | Relatório mensal layout MTE | Art. 78 §5º-A V | ✅ | 🟠 Alto | `relatorioMensalService.ts` + `CheckinController.ts` |
| F21 | Backup criptografado AFD | Art. 81 | ❌ | 🟠 Alto | Nenhum |
| F7 | Ponto por exceção | Art. 78 §1º | ❌ | 🟠 Alto | Nenhum |
| F8 | Tolerância de horário | CLT Art. 74 §2º | ⚠️ | 🟡 Médio | `CompanyController.ts:201` |

### LGPD (Lei nº 13.709/2018)

| # | Requisito | Artigo | Status | Severidade | Arquivo Atual |
|---|-----------|--------|--------|------------|---------------|
| F9 | Termos de Uso/Privacidade | Art. 7º, 9º | ✅ | 🔴 Bloqueante | `TermosDeUso.tsx`, `PoliticaPrivacidade.tsx` |
| F10 | Consentimento biométrico | Art. 11 | ✅ | 🔴 Bloqueante | `ConsentController.ts` |
| F11 | Portal do titular (DSAR) | Art. 18 | ✅ | 🔴 Bloqueante | `PrivacyController.ts` + `privacyRoutes.ts` + `MeusDadosPage.tsx` (T27) |
| F11.b | Descriptor exposto (SEC-14/15) | Art. 18 + 46 | ✅ | 🟠 Alto | `EmployeesController.ts` (token descartável) |
| F19 | Política retenção/deleção | Art. 15, 16 | ✅ | 🔴 Bloqueante | `POLITICA_RETENCAO.md`, `retentionCleanup.ts` |
| F12 | Criptografia descriptor trânsito | Art. 46 | ✅ | 🟠 Alto | `app.ts` (helmet + HSTS) |
| F13 | Contrato ctrl×operador | Art. 39 III | ✅ | 🟠 Alto | `docs/contrato-tratamento-dados.md` + `CompanySignupPage.tsx` |
| F24 | Registro operações tratamento | Art. 37 | ✅ | 🟡 Médio | `AuditMiddleware.ts` + schema `AuditLog` |
| **G1** | **FaceDescriptor criptografado em repouso** | Art. 46 | ✅ | 🟠 Alto | `faceEncryption.ts` (AES-256-GCM) |
| **G2** | **DSAR completo — portabilidade (Art. 18 V) + correção (Art. 18 III)** | Art. 18 | ✅ | 🟡 Médio | `PrivacyController.ts` (updateMyData + exportMyData) |
| **G3** | **Consentimento LGPD no aceite de convite (funcionário)** | Art. 7º, 11 | ✅ | 🔴 Bloqueante | `CompanyController.acceptInvite` + `AcceptInvitePage.tsx` |
| **G4** | **AuditLog oldData/newData capturados** | Art. 37 | ✅ | 🟡 Médio | `AuditMiddleware.ts` (oldData fetch + newData capture) |
| **G5** | **AuditMiddleware global + cobertura total rotas** | Art. 37 | ✅ | 🟡 Médio | `AuditMiddleware.ts` (global em app.ts) |
| **G6** | **CPF AES-GCM aleatório + cpfHash (SHA-256 + pepper)** | Art. 46 | ✅ | 🟡 Médio | `cpfEncryption.ts` (AES-256-GCM + hashCpf) |
| **G10** | **Revalidação biométrica periódica (usuários ativos)** | Art. 15 | ❌ | 🟡 Médio | `retentionCleanup.ts` (apenas INACTIVE) |
| F22 | Relatório conformidade (RIP) | Art. 50 | ✅ | 🟡 Médio | `RELATORIO_IMPACTO_PRIVACIDADE.md` |
| F23 | DPO/Encarregado nomeado | Art. 41 | ✅ | 🟡 Médio | `PoliticaPrivacidade.tsx` (rodapé dpo@viggo.com.br) |
| F14 | Plano resposta incidentes | Art. 48 | ✅ | 🟡 Médio | `PLANO_RESPOSTA_INCIDENTES.md` |

### CLT Art. 74

| # | Requisito | Artigo | Status | Severidade | Arquivo Atual |
|---|-----------|--------|--------|------------|---------------|
| F15 | Ponto por exceção | Art. 74 §2º | ❌ | 🟠 Alto | Nenhum |
| F16 | Tolerância 5 min | Art. 74 §2º | ⚠️ | 🟡 Médio | `CompanyController.ts:201` |

### Já conformes (sem necessidade de ação)

| Requisito | Artigo | Evidência |
|-----------|--------|-----------|
| Geolocalização pontual | LGPD Art. 5º II | `pontoPage.tsx:46` — `getCurrentPosition` único |
| Proibição de edição de batidas | Port. 671 Art. 78 | `CheckinController.ts` — apenas `create` |
| Sem ponto britânico | Port. 671 Art. 78 §1º | Liveness challenge + trigger humano |
| Sem rastreamento background | LGPD Art. 6º III | Grep `watchPosition` = vazio |
| Bloqueio de batida duplicada | Port. 671 Art. 78 | `CheckinController.ts:31-43` |
| Autenticação obrigatória | Port. 671 Art. 78 | `authMiddleware` em todas as rotas sensíveis |
| Audit trail (estrutura base) | LGPD Art. 37 | `AuditMiddleware.ts` + `AuditLog` model |
| Multi-tenancy isolado | LGPD Art. 46 | `prisma-extensions.ts` AsyncLocalStorage |
| Rate limiting | Port. 671 Art. 78 | `RateLimitMiddleware.ts` |

> ⚠️ **Nota:** "Irreversibilidade biométrica" (LGPD Art. 5º II) está **parcial** — o vetor não é imagem, mas **G1** mostra que está em texto plano no DB. Requer criptografia em repouso (ver G1).

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

> **Progresso Sprint 1:** T01 ✅ T02 ✅ T03 ✅ T04 ✅ T05 ✅ T06 ✅ T07 ✅ T08 ✅ T09 ✅ T10 ✅ T11 ✅ (11/11 — 100%)
> F4, F3/F17, F18, F2, F6, F9, F10, F19 e F20 implementados e funcionais.

**Entregáveis Sprint 1:**
- Schema Prisma atualizado (NSR, ano, employerCnpj) ✅
- 3 migrations (f4_cnpj_obrigatorio, f3f17_nsr_anual, f18_employer_cnpj_snapshot) ✅
- NSR com reinício anual + generator transacional ✅
- Rota AFD (`GET /checkins/export/afd`) com leiaute Anexo II ✅
- Comprovante retornado em `POST /checkins` com hash SHA-256 ✅
- Relatório mensal MTE (`GET /checkins/export/relatorio-mensal`) com hash SHA-256 ✅
- Termos de Uso + Política de Privacidade (páginas + rotas) ✅
- Consentimento biométrico (tela + backend + persistência) ✅
- Política de retenção documentada + job de limpeza automática ✅

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

> **Progresso Sprint 2:** T16 ✅ T12 ✅ T13 ✅ T14 ✅ T15 ✅ T17 ✅ T20 ✅ T18 ✅ T19 ✅ (9/9 — 100%)
> T16 (Helmet + HSTS), T12 (Portal do Titular DSAR), T13+T14+T15 (Token facial), T17 (Justificativa), T20 (AuditLog LGPD), T18+T19 (DPA) implementados.

**Entregáveis Sprint 2:**
- Portal do titular (DSAR) completo no backend
- Token descartável para biometria (solução SEC-14/SEC-15)
- Frontend migrado para token (sem exposição de descriptor)
- Helmet + HSTS no Express
- Modelo Justificativa + Controller + Rotas (create, list, approve)
- DPA (Data Processing Agreement) documentado + aceite no signup
- AuditLog enriquecido com base legal e finalidade LGPD

---

### 6.1. Gaps Frontend — Endpoints Backend sem Integração

> **Análise:** Após conclusão da Sprint 2, foi identificado que vários endpoints
> novos no backend **não possuem telas no frontend**. O backend está à frente do
> frontend em módulos recentes (Justificativa, Privacy/DSAR, Consent, AFD).

#### Tabelas de Gaps Frontend

| Módulo | Endpoint | API Method | Frontend Page | Status |
|--------|----------|-----------|---------------|--------|
| **Justificativa** | `POST /justificativas` | ✅ `justificativa.create()` | ✅ `JustificativasPage.tsx` | ✅ Implementado (T28) |
| **Justificativa** | `GET /justificativas` | ✅ `justificativa.list()` | ✅ `JustificativasPage.tsx` | ✅ Implementado (T28) |
| **Justificativa** | `PUT /justificativas/:id/aprovar` | ✅ `justificativa.approve()` | ✅ `JustificativasPage.tsx` | ✅ Implementado (T28) |
| **Privacy/DSAR** | `GET /privacy/my-data` | ✅ `privacy.getMyData()` | ✅ `MeusDadosPage.tsx` | ✅ Implementado (T27) |
| **Privacy/DSAR** | `DELETE /privacy/my-face` | ✅ `privacy.deleteMyFace()` | ✅ `MeusDadosPage.tsx` | ✅ Implementado (T27) |
| **Privacy/DSAR** | `GET /privacy/my-logs` | ✅ `privacy.getMyLogs()` | ✅ `MeusDadosPage.tsx` | ✅ Implementado (T27) |
| **Consent** | `POST /consentimentos` | ❌ Não existe | ❌ Nenhum | 🔴 Sem frontend |
| **Consent** | `GET /consentimentos` | ✅ `consent.list()` | ✅ `MeusDadosPage.tsx` (seção) | ✅ Implementado (T27) |
| **AFD Export** | `GET /checkins/export/afd` | ✅ `exportAfd()` | ✅ `DashboardPage.tsx` (T29) | ✅ Implementado (T29) |
| **Funcionários** | `GET /employees` | ❌ Não existe | ❌ Nenhum | 🔴 Sem frontend |

#### Telas Necessárias (Priorização Recomendada)

| # | Tela | Endpoints Consumidos | Prioridade | Status |
|---|------|---------------------|------------|--------|
| 1 | **Portal LGPD do Funcionário** — "Meus Dados" com dados pessoais, biometria, checkins, consentimentos + botão "Excluir minha face" + "Meus logs de acesso" | `GET /privacy/my-data`, `DELETE /privacy/my-face`, `GET /privacy/my-logs` | 🔴 Alta | ✅ Implementado (T27) |
| 2 | **Tela de Justificativas** — Funcionário cria justificativa (ABONO, FALTA, ATESTADO, GERAL) + Admin vê lista e aprova/rejeita | `POST /justificativas`, `GET /justificativas`, `PUT /justificativas/:id/aprovar` | 🔴 Alta | ✅ Implementado (T28) |
| 3 | **Exportar AFD no Dashboard** — Botão "Exportar AFD" (Anexo II Portaria 671) com seletor de período | `GET /checkins/export/afd` | 🟡 Média | ✅ Implementado (T29) |
| 4 | **Dashboard de Consentimentos** — Funcionário vê histórico de consentimentos aceitos (Termos, Política, Biometria, DPA) | `GET /consentimentos` | 🟡 Média | ✅ Parcial — integrado na seção "Consentimentos" do Portal LGPD (T27) |
| 5 | **Lista de Funcionários** — Admin vê e gerencia funcionários da empresa | `GET /employees` | 🟡 Média | ✅ Implementado (T31) — aba "Funcionários" no Dashboard com seletor de data, biometria e checkins |

#### Notas Técnicas

- `PoliticaPrivacidade.tsx` é apenas texto estático legal — **não consome** os endpoints `/privacy/*`
- `exportAfd()` já existe em `api.ts` e foi integrado ao `DashboardPage.tsx` no T29 (botão "Exportar AFD")
- `GET /employees` não tem API method nem consumer no frontend
- `GET /checkins/month` (listMonthly) não é chamado por nenhuma tela (foi removido do frontend no F20)
- **T27 (Portal LGPD)** integrado: `MeusDadosPage.tsx` consome 4 endpoints (`getMyData`, `deleteMyFace`, `getMyLogs`, `consent.list`) — rota `/meus-dados` no `UserRoutes.tsx` + link "Meus Dados" no menu `layoutPage.tsx`

---

#### Implementação T27 — Portal LGPD do Funcionário (MeusDadosPage)

> **Status:** ✅ IMPLEMENTADO (23/07/2026)
> **Sprint:** Sprint 3 — Tarefa T27 (Gap Frontend)

**Página:** `frontend/src/pages/MeusDadosPage.tsx`

A página "Meus Dados — Portal LGPD" exibe em 5 seções os dados do funcionário, atendendo aos direitos do titular previstos no Art. 18 da LGPD:

1. **Dados Pessoais** — `data.dadosPessoais` (nome, email, CPF, cargo, cadastro, último login)
2. **Dados Biométricos** — `data.dadosBiometricos` (possui descriptor, dimensões, observação +
   botão "Excluir Minha Biometria" com confirmação em 2 passos — Art. 18, VIII LGPD)
3. **Registros de Ponto** — `data.registrosPonto` (tabela com Data/Hora, NSR, Tipo — últimos 100)
4. **Consentimentos** — `data.consentimentos` (Termos, Política, Biometria, DPA — status Aceito/Revogado)
5. **Logs de Acesso** — `logs` (`privacy.getMyLogs()` — últimos 50, com action, IP, base legal, finalidade)

**API Methods adicionados em `api.ts`:**

```typescript
privacy: {
  getMyData: ()    => fetchApi<MyDataResponse>("/privacy/my-data"),
  deleteMyFace: () => fetchApi<{ message: string }>("/privacy/my-face", { method: "DELETE" }),
  getMyLogs: ()    => fetchApi<{ logs: AuditLogEntry[] }>("/privacy/my-logs"),
},
consent: {
  list: () => fetchApi<ConsentimentoResponse[]>("/consentimentos"),
},
```

**Tipos novos:** `MyDataResponse`, `ConsentimentoResponse`, `AuditLogEntry`

**Roteamento:**
- `UserRoutes.tsx:26` — `<Route path="meus-dados" element={<MeusDadosPage />} />`
- `layoutPage.tsx:77-84` — link "Meus Dados" no menu dropdown do employee

**Arquivos afetados:**
- Novo: `frontend/src/pages/MeusDadosPage.tsx`
- Alterado: `frontend/src/services/api.ts` — `privacy.*` + `consent.*` + novos tipos
- Alterado: `frontend/src/routes/UserRoutes.tsx` — rota `/meus-dados`
- Alterado: `frontend/src/pages/layoutPage.tsx` — link de navegação no menu

---

#### Implementação T28 — Tela de Justificativas (JustificativasPage)

> **Status:** ✅ IMPLEMENTADO (23/07/2026)
> **Sprint:** Sprint 3 — Tarefa T28 (Gap Frontend)

**Página:** `frontend/src/pages/JustificativasPage.tsx`

Página **adaptativa única** que serve tanto **EMPLOYEE** (criar + listar próprias justificativas) quanto **ENTERPRISE_ADMIN/MASTER** (listar todas da empresa + aprovar/rejeitar):

- **Employee**: Form modal para criar justificativa (tipo, descrição, data início/fim) + lista das suas
- **Admin**: Tabela com filtros por status (TODOS/PENDENTE/APROVADO/REJEITADO) + botões Aprovar/Rejeitar

**API Methods adicionados em `api.ts`:**

```typescript
justificativa: {
  create: (body: JustificativaCreateBody) =>
    fetchApi<JustificativaResponse>("/justificativas", { method: "POST", body: JSON.stringify(body) }),

  list: () =>
    fetchApi<(JustificativaResponse & { user?: { id: string; name: string; email: string } })[]>("/justificativas"),

  approve: (id: string, aprovado: boolean) =>
    fetchApi<JustificativaResponse>(`/justificativas/${id}/aprovar`, { method: "PUT", body: JSON.stringify({ aprovado }) }),
},
```

**Tipos novos:** `JustificativaTipo`, `JustificativaCreateBody`, `JustificativaResponse`

**Roteamento:**
- `UserRoutes.tsx:28` — `<Route path="justificativas" element={<JustificativasPage />} />`
- `AdminRoutes.tsx:28` — `<Route path="justificativas" element={<JustificativasPage />} />`

**Navegação:**
- `layoutPage.tsx:84-90` — link "Justificativas" no menu dropdown (visível p/ employee + admin)

**Arquivos afetados:**
- Novo: `frontend/src/pages/JustificativasPage.tsx`
- Alterado: `frontend/src/services/api.ts` — `justificativa.*` + novos tipos
- Alterado: `frontend/src/routes/UserRoutes.tsx` — rota `/justificativas`
- Alterado: `frontend/src/routes/AdminRoutes.tsx` — rota `/justificativas`
- Alterado: `frontend/src/pages/layoutPage.tsx` — link no menu

---

### Sprint 3 — FUNCIONALIDADES COMPLEMENTARES + FRONTEND (3-4 semanas)

> **Foco:** Telas frontend faltantes, ponto por exceção, tolerância, criptografia CPF, incidentes.

| Tarefa | Finding | Item | Esforço | Dependências |
|--------|---------|------|---------|--------------|
| T21 | **F7** | Flag `regimePonto` no settings + lógica no controller para regime de exceção | Médio | T17 |
| T22 | **F8** | `toleranceCalculator.ts` integrado ao `CheckinController` | Baixo | Nenhuma |
| T23 | **F12** | Criptografia de CPF no banco (`utils/cpfEncryption.ts` — AES-256-CBC determinístico) | Médio | Nenhuma |
| T24 | **F14** | `docs/PLANO_RESPOSTA_INCIDENTES.md` (template ANPD 72h) | Baixo | Nenhuma |
| T25 | **F22** | `docs/RELATORIO_IMPACTO_PRIVACIDADE.md` (RIP) | Baixo | Nenhuma |
| T26 | **F23** | Nomear DPO + incluir contato no rodapé da Política de Privacidade | Baixo | T06 |
| T27 | **Gap FE** | Portal LGPD do Funcionário (`/meus-dados`) — dados pessoais, excluir face, logs | Médio | Nenhuma |
| T28 | **Gap FE** | Tela de Justificativas — criar (funcionário) + listar/aprovar (admin) | Alto | T17 |
| T29 | **Gap FE** | Botão "Exportar AFD" no Dashboard admin | Baixo | Nenhuma |
| T30 | **Gap FE** | Dashboard de Consentimentos — visualizar consentimentos aceitos | Baixo | Nenhuma |
| T31 | **Gap FE** | Lista de Funcionários — `GET /employees` + tela admin | Médio | Nenhuma |

> **Progresso Sprint 3:** T21 ❌ T22 ✅ T23 ✅ T24 ✅ T25 ✅ T26 ✅ T27 ✅ T28 ✅ T29 ✅ T30 ⚠️ T31 ✅
> T24 (Plano de Resposta a Incidentes — `PLANO_RESPOSTA_INCIDENTES.md`), T25 (Relatório de Impacto — `RELATORIO_IMPACTO_PRIVACIDADE.md`), T26 (DPO no rodapé da Política de Privacidade) implementados.
> T27 (Portal LGPD — `MeusDadosPage.tsx` consumindo `/privacy/*` + `/consentimentos`), T28 (Tela de Justificativas — `JustificativasPage.tsx` adaptativa employee/admin) e T29 (botão "Exportar AFD" no Dashboard) implementados.
> T30 parcialmente coberto: seção "Consentimentos" integrada ao Portal LGPD (T27).
> T31 implementado: aba "Funcionários" no Dashboard reescrita para consumir `GET /employees` com seletor de data, status biométrico e checkins do dia.
> T22 implementado: `WorkSchedule` model + `toleranceCalculator.ts` + CRUD (`WorkScheduleController`) + aba "Horários" no Dashboard + tolerância integrada ao `CheckinController`.
> T23 implementado: CPF criptografado com AES-256-CBC determinístico (`cpfEncryption.ts`) — mesmo CPF = mesmo ciphertext = @unique funciona. Env var `CPF_ENCRYPTION_KEY` (hex 64 chars).

**Entregáveis Sprint 3:**
- Suporte a ponto por exceção (settings + lógica) ⚠️ Adiado
- Tolerância de horário aplicada no backend ✅
- CPF criptografado no banco (AES-256-GCM) ✅
- Documento de resposta a incidentes (ANPD 72h) ✅
- Relatório de impacto à privacidade (RIP) ✅
- DPO nomeado + contato exposto ✅
- **Portal LGPD do Funcionário** (dados pessoais + exclusão face + logs) ✅
- **Tela de Justificativas** (criação + aprovação) ✅
- **Exportar AFD** no dashboard ✅
- **Dashboard de Consentimentos** ⚠️ Parcial
- **Lista de Funcionários** ✅

---

### Sprint 4 — ASSINATURA E BACKUP (3-4 semanas) — Certificação REP-P

> **Foco:** ICP-Brasil, backup AFD, restore, conformidade final.

| Tarefa | Finding | Item | Esforço | Dependências |
|--------|---------|------|---------|--------------|
| T32 | **F1** | Aquisição de certificado ICP-Brasil A1/A3 (e-CNPJ) | Alto | Jurídico |
| T33 | **F1** | `scripts/sign-build.ts` — assinatura SHA-256 do bundle compilado | Alto | T32 |
| T34 | **F1** | `scripts/verify-signature.ts` — verificação no deploy | Médio | T33 |
| T35 | **F1** | Validação de integridade no frontend (`utils/integrity.ts`) | Médio | T34 |
| T36 | **F21** | `afdBackup.ts` — job mensal de backup AFD criptografado (S3/KMS) | Médio | T04 |
| T37 | **F21** | `backupStorage.ts` — utilitário de upload + validação de restore periódico | Médio | T36 |

**Entregáveis Sprint 4:**
- Certificado ICP-Brasil obtido
- Pipeline de assinatura do build (CI/CD GitHub Actions)
- Verificação de assinatura no deploy
- Validação de integridade no frontend (bloqueia execução se compromised)
- Backup automático mensal do AFD de cada empresa (criptografado)
- Exercício de restore documentado

---

### Sprint 5 — LACUNAS LGPD CRÍTICAS (2-3 semanas) — Novas Lacunas G1–G10

> **Foco:** Lacunas identificadas na revisão de 26/07/2026 — criptografia faceDescriptor, DSAR completo, consentimento no invite, auditoria completa, CPF AES-GCM, testes.

| Tarefa | Finding | Item | Esforço | Dependências |
|--------|---------|------|---------|--------------|
| T38 | **G3** 🔴 | Consentimento LGPD no fluxo de aceite de convite (`AcceptInvitePage.tsx` + `CompanyController.acceptInvite`) — 4 checkboxes obrigatórios | Baixo | Nenhuma | ✅ Implementado |
| T39 | **G8** | Remover `SessionController.create` legacy (`companyId: "1"` hardcoded) | Baixo | Nenhuma | ✅ Implementado |
| T40 | **G1** 🟠 | Criptografar `faceDescriptor` em repouso (AES-256-GCM + nonce aleatório) — `faceEncryption.ts` | Médio | T38 | ✅ Implementado |
| T41 | **G2** 🟡 | Completar DSAR: `PUT /privacy/my-data` (correção Art. 18 III) + `GET /privacy/export` (portabilidade Art. 18 V) | Médio | Nenhuma | ✅ Implementado |
| T42 | **G4, G5** 🟡 | `AuditMiddleware` global + capturar `oldData`/`newData` em UPDATE/DELETE + expandir mapeamento para todas rotas | Baixo-Médio | Nenhuma | ✅ Implementado |
| T43 | **G6** 🟡 | Migrar CPF para AES-256-GCM aleatório + coluna `cpfHash` (SHA-256 + pepper) para `@unique` | Médio | T40 | ✅ Implementado |
| T44 | **G7** 🟡 | Política de revalidação biométrica periódica (2 anos) + job de expiração + notificação | Baixo | T40 |
| T45 | **G10** 🟡 | Suite de testes automatizados (vitest) — cobertura mínima rotas críticas | Alto | Nenhuma |
| T46 | **G9** | Corrigir/remover `scripts/migrate-roles.ts` (campo `enterpriseId` inexistente) | Baixo | Nenhuma | ✅ Implementado |

> **Progresso Sprint 5:** T38 ✅ T39 ✅ T40 ✅ T41 ✅ T42 ✅ T43 ✅ T44 ❌ T45 ❌ T46 ✅ (7/9)

**Entregáveis Sprint 5:**
- Consentimento LGPD no aceite de convite (funcionários onboarded via invite)
- Remoção de rota legada com multi-tenancy hardcoded
- FaceDescriptor criptografado em repouso (AES-256-GCM)
- DSAR completo (correção + portabilidade)
- Auditoria LGPD global com payloads before/after
- CPF com criptografia probabilística (AES-GCM) + hash determinístico para unique
- Revalidação biométrica periódica (2 anos)
- Testes automatizados vitest + CI
- Script de migração de roles corrigido

---

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

**Nota:** Enquanto a certificação INMETRO não é concluída, todos os **32 findings (26 originais + G1–G10)** devem estar resolvidos para minimizar risco jurídico. O Viggo pode operar em **regime de tolerância** (beta) com empresas que aceitem o risco, desde que informadas explicitamente via DPA.

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
| LGPD | Art. 37 | Registro de operações de tratamento |
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
| F12 / **G1** (Criptografia descriptor) | SEC-31 (helmet), SEC-51 (descriptor sem cripto) |
| F11 (DSAR) / **G2** | SEC-14 (descriptor exposto), SEC-15 (descriptor no checkin) |
| F4 (CNPJ obrigatório) / **G8** | SEC-16 (empresa hardcoded "1") |
| **G4/G5** (AuditLog payload) | — |
| **G6** (CPF AES-GCM) | — |

---

*Documento gerado em 17/07/2026 como parte da análise de conformidade do projeto Viggo.*
*Atualizado em 23/07/2026 — F2, F3/F17, F4 e F18 implementados.*
*Atualizado em 23/07/2026 — T27 (Portal LGPD do Funcionário) + T29 (Exportar AFD) implementados no frontend.*
*Atualizado em 23/07/2026 — T28 (Tela de Justificativas employee/admin) implementada.*
*Atualizado em 26/07/2026 — Revisão completa do código: novas lacunas G1–G10 identificadas, Sprint 5 adicionada, compliance map atualizado.*
*Este documento deve ser revisado por assessor jurídico especializado em LGPD e legislação trabalhista antes da comercialização do produto.*

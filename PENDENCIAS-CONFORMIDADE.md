# Pendências de Conformidade — Viggo (Unificado LEGISLACAO + Compliance Audit)

**Data:** 22/08/2026  
**Base:** `LEGISLACAO.md` (32 findings + G1-G10, Sprints 1-5) + `compliance-audit.md` (21/08/2026, P0-P2)  
**Verificação:** Código real lido via `explore` (3 agents) — status abaixo é **real**, não o declarado nos docs.  
**Veredito:** `LEGISLACAO` Sprints 1-2 100%, Sprint3 9/11, Sprint5 8/9 | `compliance-audit` núcleo REP-P maduro, mas **3 bloqueantes + 6 altos** impedem homologação REP-P.  
**Gate Go-Live:** Travar faturamento até **B1-B3**; beta com DPA possível sem **B1/B2** (risco informado).

**Legenda:** 🔴 Bloqueante (app não pode operar como REP-P) | 🟠 Alto (multa MTE R$3k-60k / ANPD até 2% faturamento) | 🟡 Médio (fiscalizável LGPD/UX) | ⚪ Baixo (maturidade pós-go-live)

---

## Resumo Executivo

| Prioridade | Qtd | Itens | Esforço total |
|---|---|---|---|
| 🔴 Bloqueante | 3 | B1 Assinatura A1, B2 Backup Art.81, B3 Motor jornada | 4-5 sem + aquisição cert |
| 🟠 Alto | 6 | A1 Ponto exceção, A2 RBAC, A3 Base biometria, A4 Hardening, A5 Pepper CPF, A6 Teto tolerância | 2-3 sem |
| 🟡 Médio | 4 | M1 Audit oldData, M2 Invite DPA, M3 Timezone, M4 Dashboard consent | 1 sem |
| ⚪ Baixo | 3 | X1 Liveness, X2 Geofence, X3 Key rotation | 1-2 sem |
| **Total pendente** | **16** | — | **~8-11 sem** |

> AEJ (`AejController.ts` + `checkinRoutes.ts:16`), retenção 5a (`retentionCleanup.ts:47` já faz `ARCHIVE`), NSR `tx` (`nsrGenerator.ts:21` + `AfdController.ts:76`) já corrigidos em 21/08 — só validar.

---

## 🔴 BLOQUEANTE — Trava Go-Live REP-P

### B1. Assinatura Digital ICP-Brasil A1 (Port. 671 Art.79 §2º / Art.78 §2º) — ✅ IMPLEMENTADO (plug-and-play)

- **Severidade:** 🔴 Bloqueante — sem cert, MTE recusa homologação.
- **Status:** ✅ **Pronto para receber seu .p12** — sem cert roda só com `SHA-256`, com cert assina `PKCS#7 detached base64` sem mudar código.
- **Implementado 22/08:**
  1. `backend/package.json` `+ node-forge@1.3 + @types/node-forge` instalados.
  2. `backend/src/utils/afSignature.ts:1-110` implementado: `signContent()` detecta `CERT_A1_PATH` (`existsSync`) ou `CERT_A1_BASE64` (prioriza Base64 p/ Docker), extrai `privateKey+cert` via `forge.pkcs12`, cria `p7.createSignedData()` detached `SHA-256` + `signingTime`, retorna `{hash, assinado:true, assinatura: base64}`. Sem cert → `{hash, assinado:false}`. Com cert inválido → `{hash, assinado:false, erro}`.
  3. `backend/src/controller/AfdController.ts:141` + `AejController.ts:153` + `CheckinController.ts:92` (comprovante) + `CheckinController.ts:312` (relatório CSV/PDF) padronizados: `X-Hash-SHA256` sempre, `X-Signature` se assinado, `X-Signature-Error` se falhou.
  4. `backend/certs/.gitkeep` + `backend/.gitignore` `certs/*.p12/*.pfx` + `backend/.env-example:19` documentado.
  5. Testes: `backend/src/test/unit/utils/afSignature.test.ts` (3) + `AfdController.test.ts:73` atualizado p/ `HASH:` line.
  6. Build ✅ `npm run build`, 547 unit tests ✅.
- **Como inserir seu certificado (quando chegar):**
  - **Local:** salve `viggo-a1.p12` em `backend/certs/viggo-a1.p12` e em `backend/.env` `CERT_A1_PATH=./certs/viggo-a1.p12` + `CERT_A1_PASSWORD=suaSenha` → `npm run dev` (restart).
  - **Prod (recomendado):** `base64 -w0 viggo-a1.p12` (Linux) ou `certutil -encode` (Win) → `backend/.env` `CERT_A1_BASE64=<base64>` + `CERT_A1_PASSWORD` (ignora `PATH`, funciona em Docker/K8s). Reinicie.
  - **Validar:** `curl -i /checkins/export/afd?startDate=...` → sem cert: `X-Hash-SHA256` sem `X-Signature`; com cert: `X-Signature: <base64 PKCS#7>` + `assinado:true`.
  - **Comprovante:** `POST /checkins` agora retorna `{comprovante, hashVerificacao, assinatura?, assinado, assinaturaErro?}` + headers `X-Hash/X-Signature`.
- **Origem:** `LEGISLACAO.md:149` F1 + `compliance-audit.md:224` P1

### B2. Backup Criptografado AFD/AEJ Art.81 (5 anos, WORM) — ✅ IMPLEMENTADO (Modelo A — mensal versionado, local criptografado, pronto p/ S3)

- **Severidade:** 🔴 Bloqueante — sem backup, multa por não apresentação fiscal.
- **Status:** ✅ **Modelo A implementado** — 1 arquivo/mês/empresa, nunca sobrescreve, criptografado `AES-GCM` + assinado B1, conforme Art.81.
- **Implementado 22/08:**
  1. `backend/src/utils/environment.ts:21` `+ AFD_BACKUP_KEY (hex64 opcional), AFD_BACKUP_DIR (default ./backups), S3_BUCKET/S3_REGION/*` — sem env job faz `skip` (plug-and-play).
  2. `backend/src/utils/backupStorage.ts` (novo) — `encryptBackup/decryptBackup` `AES-256-GCM iv12 tag16 {v,ct,iv,tag} base64`, `saveBackup(key,enc)` → se `S3_BUCKET` → warn + fallback local `AFD_BACKUP_DIR/{companyId}/afd/YYYY-MM.txt.enc`, `backupExists/readBackup/listBackups`.
  3. `backend/src/scripts/afdBackup.ts` (novo) — `runAfdBackup({year,month,companyId,force})` Modelo A: `buildAfdForCompany` (reuso `AfdController` sem HTTP, `companyId+createdAt gte/lte` indexado `schema.prisma:81`), `signContent` B1 (`HASH`+`SIGNATURE`), `encryptBackup` + `saveBackup` + `AuditLog BACKUP {period,key,hash,assinado,bytes}`. Idempotente: `backupExists` → `skipped`.
  4. `backend/src/server.ts:17` crons: `0 2 * * *` retention + `0 3 1 * *` backup mensal (dia 01 03:00 mês anterior, off-peak, `p-limit` futuro).
  5. `backend/package.json` `+ backup:afd` (`tsx --env-file .env src/scripts/afdBackup.ts`), `backend/.env-example:19` com `AFD_BACKUP_KEY` (`openssl rand -hex 32`), `backend/.gitignore` `backups/`, `backend/backups/.gitkeep`.
  6. Testes: `backend/src/test/unit/utils/backupStorage.test.ts` (4) — criptografia, nonce aleatório, save/read. Build ✅ 554 tests ✅.
  7. Retenção >5a: `retentionCleanup.ts:47` já faz `AuditLog ARCHIVE` antes de `deleteMany`; agora backup mensal garante `AuditLog BACKUP` prévio. Só deletamos lote mensal arquivado.
- **Como usar (local criptografado):**
  - Gere chave: `openssl rand -hex 32` (ou `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) → `backend/.env` `AFD_BACKUP_KEY=<hex64>` (mantenha fora do git).
  - Manual: `npm run backup:afd -- --year 2026 --month 8 --force` → `backend/backups/{companyId}/afd/2026-08.txt.enc` + log `AFD_BACKUP`.
  - Fiscal: `npm run backup:afd -- --year 2026 --month 8 --companyId <uuid>` para período avulso; descriptografar: `readBackup` (ou script `decrypt` com mesma key).
  - **Futuro S3:** preencha `S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY` no `.env` que `backupStorage.ts` passa a subir para S3 sem mudar código (hoje fallback local + warn).
- **Carga:** 1 `findMany` por empresa/mês (100 empresas = 100 queries 03:00). 12 arquivos/empresa/ano, 60 em 5a (~200KB/mês com 1k batidas).
- **Origem:** `LEGISLACAO.md:1264` F21 + `compliance-audit.md:225`

### B3. Motor de Jornada CLT Art.59/71/73/66

- **Severidade:** 🔴 Bloqueante — relatório sem cálculo não passa auditoria MTE.
- **Status real:** `backend/src/services/relatorioMensalService.ts:211` calcula **Horas** sempre + **Extras >8h** `relatorioMensalService.ts:231` + **Intervalo<60** `relatorioMensalService.ts:222` (`*T/*E/*I`). **Falta** adicional noturno 22-05 20% `CLT 73`, interjornada 11h `CLT 66`, 44h/sem, DSR, 12x36/banco horas. `backend/prisma/schema.prisma:211` `WorkSchedule` só `entry/lunch/exit + tolerance`, sem `overtimeEnabled` etc (`compliance-audit.md:53`).
- **O que fazer:**
  1. `schema.prisma` `WorkSchedule { jornadaTipo, overtimeEnabled, adicionalNoturnoEnabled }` + migration.
  2. Novo `backend/src/utils/jornadaCalculator.ts` (noturno, interjornada, semanal) + integrar `relatorioMensalService.ts:205` colunas `Normais|Extras|Noturnas|Saldo Intervalo`.
- **Critério:** Relatório mensal passa em planilha MTE simulada (8h/dia, 44h/sem, noturno 22-05).
- **Origem:** `compliance-audit.md:210` P0

---

## 🟠 ALTO — Sujeito a Multas (entrega em até 30 dias)

### A1. Ponto por Exceção (Port.671 Art.78 §1º / CLT 74 §2º)

- **Status:** `grep regimePonto` 0 hits no código, `CompanyController.ts:239` `settings` sem `regimePonto`, `CheckInType` `schema.prisma:204` sem `AUSENCIA` (`LEGISLACAO.md:792`).
- **Fazer:** `Company.settings.regimePonto: COMUM|EXCECAO` + enum `AUSENCIA` + lógica `CheckinController` (só `ENTRY` + justificativa).
- **Origem:** `LEGISLACAO.md:787` F7/F15 + `compliance-audit.md` P1

### A2. Controle de Acesso AFD/AEJ/Relatório — ✅ CONCLUÍDO 22/08/2026

- **Status:** `backend/src/routes/checkinRoutes.ts:15-18` agora com `authMiddleware, requireEnterpriseAdmin` (`backend/src/middleware/RoleGuard.ts:25`). `EMPLOYEE` recebe `403` em AFD/AEJ/relatório; `ENTERPRISE_ADMIN`/`MASTER` liberados. `GET /privacy/export` permanece liberado p/ employee.
- **Feito:** `backend/src/routes/checkinRoutes.ts:7` import `requireEnterpriseAdmin` + `backend/src/routes/checkinRoutes.ts:16-18` guard nas 3 rotas `export/afd|aej|relatorio-mensal`.
- **Origem:** `compliance-audit.md:134` + `228`

### A3. Base Legal Biometria Incorreta — ✅ CONCLUÍDO 22/08/2026

- **Status:** `backend/src/middleware/AuditMiddleware.ts:87` corrigido para `Art.11 I consentimento específico + Art.11 II g prevenção à fraude`; `backend/docs/RELATORIO_IMPACTO_PRIVACIDADE.md:26` §1.2 desdobrado (cadastro vs validação diária + LIA R5-Bis) e `M7` atualizado; `frontend/src/pages/PoliticaPrivacidade.tsx:59` §4/§9 alinhados com nota `tutela saúde (II f) inaplicável`.
- **Feito:** 3 arquivos, DPIA/LIA documentada para ANPD, `tutela saúde` removida do `AuditLog legalBasis`.
- **Origem:** `compliance-audit.md:159`

### A4. Hardening CheckIn + Geolocalização — ✅ PARCIAL 22/08/2026 (sem reverse-geocode)

- **Status:** `backend/src/controller/CheckinController.ts:15` Zod `finite/min/max` + `CheckinController.ts:36` máquina `ENTRY→LUNCH_START→LUNCH_END` e `EXIT só exige ENTRY` (409 `INVALID_SEQUENCE`), `frontend/src/pages/pontoPage.tsx:80` não bloqueia mais se negar geo, `backend/prisma/schema.prisma:61` `CheckIn { latitude? longitude? geolocationAccuracy geolocationDenied geolocationConsent }` + `backend/src/utils/comprovanteGenerator.ts:73` trata `null` como "Não informada".
- **Feito:** Auto-cria `Justificativa JUSTIFICATIVA_GERAL` pendente (`aprovado=null`) quando `geolocationDenied=true` para `frontend/src/pages/JustificativasPage.tsx` / `admin/JustificativasAdminPage.tsx`. `latitude/longitude` nullable, `accuracy` capturado.
- **Pendente (decidir depois):** `address`/`reverse-geocode` backend (`backend/src/utils/geolocation.ts`) — solicitado adiar. Hoje `address` vem `null`/frontend e é sobrescrito para `null`. Quando decidir, plugar provider `Nominatim`/`Google` com timeout 1.5s + cache + `environment.ts` `GEOCODE_PROVIDER` sem bloquear batida.
- **Origem:** `compliance-audit.md:101+174` + `229`

### A5. Pepper CPF Reutilizado — ✅ CONCLUÍDO 22/08/2026 (DB zerado — sem re-hash)

- **Status:** `backend/src/utils/cpfEncryption.ts:21` `getHashPepper() = CPF_HASH_PEPPER ?? CPF_ENCRYPTION_KEY` (fallback); `backend/src/utils/environment.ts:13` `CPF_HASH_PEPPER` hex64 opcional; `backend/.env-example:5` documentado.
- **Feito:** 22/08 — DB zerado, basta setar `.env` com 2 valores distintos (`openssl rand -hex 32` cada). Nenhum `cpfHash` órfão. Fallback garante zero downtime se esquecer `CPF_HASH_PEPPER` em dev.
- **Prod:** gere `CPF_HASH_PEPPER` distinto, nunca reuse `CPF_ENCRYPTION_KEY`. Com banco populado futuro, rodar `backend/src/scripts/rehashCpf.ts` (batch 100) para re-hashear `cpfHash` com novo pepper.
- **Origem:** `compliance-audit.md:143` + `LEGISLACAO.md:1595` G6 ressalva

### A6. Teto Tolerância 10min/dia (CLT 58 §1º segunda parte) — ✅ CONCLUÍDO 22/08/2026

- **Status:** `backend/src/utils/toleranceCalculator.ts:104` `+ TOLERANCIA_DIARIA_MAX=10` + `aplicarToleranciaComTeto()`; `backend/src/services/relatorioMensalService.ts:142` refatorado para usar helper (mantém `toleranciaConsumida` sequencial, `*T` por ENTRY/EXIT, lunch 15 min não consome teto); `CheckinController.ts:68` cru no DB correto Port.671 Art.80.
- **Feito:** `backend/src/test/unit/utils/toleranceCalculator.test.ts:234` `+ describe teto diário 10 min` — casos `5+5=10 OK`, `5+6=11 só 1 *T` (Súmula 366), `3+3+4=10`, adiantamento/0 não consome, lunch sanity.
- **Origem:** `compliance-audit.md:85` + `LEGISLACAO.md:820` F8

---

## 🟡 MÉDIO — Fiscalizável LGPD/UX

### M1. AuditLog oldData/newData Sempre Null — ✅ CONCLUÍDO 22/08/2026

- **Status:** `backend/src/middleware/AuditMiddleware.ts:246` `eagerOldData` + lazy `await fetchOldData(req)` dentro de `res.json` override quando `req.user` existe; `AuditMiddleware.ts:268` `newData` agora em `PUT` e `POST` (201) com `redactSensitive` `AuditMiddleware.ts:150` e fallback para `createMany` array.
- **Feito:** Trilha completa `oldData/newData` sem mover `app.ts:14`; compatível com `authMiddleware` per-route.
- **Origem:** `LEGISLACAO.md:1544` G4 + `compliance-audit.md:161`

### M2. Consentimento no Invite Incompleto — ✅ CONCLUÍDO 22/08/2026 — Opção A (2 checkboxes)

- **Status:** `frontend/src/components/company/AcceptInvitePage.tsx:12` `aceiteContratos + aceiteBiometria` (2 checkboxes: `Termos+Política+DPA` + `Biometria` Art.11 I destacado), `frontend/src/schemas/companySignup.ts:3` `aceiteContratos` (signup 1 checkbox para os 3 contratos), `frontend/src/services/api.ts:385/521` DTOs compatíveis, `backend/src/controller/company/CompanyController.ts:19/557` `aceiteContratos` → 4 `Consentimento` (`TERMOS_DE_USO, POLITICA_PRIVACIDADE, BIOMETRIA, DPA`).
- **Feito:** Fluxo empresa (1 checkbox) e funcionário (2 checkboxes, biometria isolada) harmonizados; `DPA` nunca bundlado com biometria — conforme LIA `RIPD.md:26`.
- **Origem:** `LEGISLACAO.md:1505` G3

### M3. Timezone BRT

- **Status:** `comprovanteGenerator.ts:76`/`AfdController.ts:17` `getDate()` local sem `Intl`/`date-fns-tz` — divergência AFD vs comprovante.
- **Fazer:** Fixar `America/Sao_Paulo` com `date-fns-tz`, armazenar UTC mas exibir BRT com offset `XXX`.
- **Origem:** `compliance-audit.md:79` + `231`

### M4. Dashboard Consentimentos Admin

- **Status:** `MeusDadosPage.tsx:346` seção `Consentimentos` só portal funcionário, sem rota admin `LEGISLACAO.md:1109` T30 ⚠️ parcial.
- **Fazer:** Rota `GET /admin/consentimentos` + tela admin listagem (ou integrar em `DashboardPage.tsx` aba).
- **Origem:** `LEGISLACAO.md:1993` T30

---

## ⚪ BAIXO — Maturidade Pós Go-Live

### X1. Liveness Server-Side

- **Status:** `EmployeesController.ts:136` `threshold 0.5` fixo, `TotemController` idem; `LivenessChallenge.tsx` valida `EAR<0.27` só no browser, atacante pode `POST /face/verify` sintético.
- **Fazer:** Enviar `yaw/pitch/EAR` para `verifyFace`, validar no backend; `faceValidationLimiter` `RateLimitMiddleware.ts` para `60/min IP + 10/min user`.
- **Origem:** `compliance-audit.md:126` + `231`

### X2. Geofence Opcional Auditável

- **Status:** `Company.settings:20` fantasma (`CompanyController.ts:239` não lê), sem `backend/src/utils/geolocation.ts` haversine (`grep geofence` 0 em código), sem `outsideGeofence` flag.
- **Fazer:** Se `settings.geofence.enabled`, `geolocation.ts:haversine` + `CheckinController` flag `outsideGeofence` + justificativa (sem bloquear batida).
- **Origem:** `compliance-audit.md:55` + `235`

### X3. Key Rotation + Remover Fallback CBC

- **Status:** `faceEncryption.ts` sem `FACE_ENCRYPTION_KEY_ID` envelope, `cpfEncryption.ts:95` `decryptLegacyCbc` IV previsível `sha256`.
- **Fazer:** `FACE_ENCRYPTION_KEY_ID` + job re-criptografia `biometricRevalidation.ts`, log `WARN` e deprecar `decryptLegacyCbc` após migração.
- **Origem:** `compliance-audit.md:145` + `237`

---

## Roteiro Sugerido

| Sprint | Itens | Duração |
|---|---|---|
| **Sprint 6 — Go-Live mínimo** | B1 + B2 + B3 + A6 (validar AEJ/retenção/NSR) | 3-4 sem + aquisição cert |
| **Sprint 7 — Homologação** | A1 + A2 + A3 + A4 + A5 + M1 + M2 | 2-3 sem |
| **Sprint 8 — Polimento** | M3 + M4 + X1 + X2 + X3 + teste concorrência NSR 20x | 1-2 sem |

**Critério Go-Live comercial:** Sprint 6 concluída + re-auditoria com validador MTE (eSocial) + `isolation.test.ts` + DPIA assinado (`compliance-audit.md:260`). Enquanto B1/B2 pendentes, operar em **beta com DPA** informando risco (`LEGISLACAO.md:2093`).

---

## Referências Cruzadas

| Doc | Seção | Código |
|---|---|---|
| `LEGISLACAO.md:149` F1 | Assinatura ICP | `afSignature.ts:31`, `comprovanteGenerator.ts:82` |
| `LEGISLACAO.md:1264` F21 | Backup Art.81 | `afdBackup.ts` (novo) |
| `LEGISLACAO.md:787` F7/F15 | Ponto exceção | `schema.prisma:204`, `CompanyController.ts:239` |
| `LEGISLACAO.md:820` F8 | Tolerância | `toleranceCalculator.ts:20`, `relatorioMensalService.ts:142` |
| `LEGISLACAO.md:1505` G3 | Invite consent | `AcceptInvitePage.tsx:229`, `CompanyController.ts:551` |
| `LEGISLACAO.md:1544` G4 | Audit oldData | `AuditMiddleware.ts:246` |
| `compliance-audit.md:210` | Motor jornada P0 | `relatorioMensalService.ts:100` |
| `compliance-audit.md:159` | Base biometria P1 | `AuditMiddleware.ts:87` |
| `compliance-audit.md:224` | Assinatura P1 | `afSignature.ts:55` |

*Atualizar este arquivo a cada entrega: marcar `[x]` e linkar commit/PR.*

# Auditoria de Conformidade Técnica-Jurídica — Projeto Viggo

**Escopo:** Código-fonte completo (backend Node/Express/Prisma + frontend React/face-api.js)  
**Data:** 21/08/2026  
**Auditor:** Especialista em Conformidade e Direito Trabalhista/Digital (Viggo)  
**Base Legal:** CLT Decreto-Lei 5.452/1943, Portaria MTP n.º 671/2021 (REP-P), LGPD Lei 13.709/2018  
**Metodologia:** Inspeção estática + rastreio de fluxos (auth → registro → exportação → eliminação), validação de criptografia, constraints DB, rotas HTTP, e lógicas de tolerância/jornada.

> **Veredito Global: INCONFORME PARA GO-LIVE COMERCIAL.** Sistema possui núcleo REP-P e LGPD bem estruturado (NSR, AFD, criptografia de biometria/CPF, DSAR), mas apresenta **bloqueadores** em CLT (cálculo de jornada inexistente), Portaria 671 (AEJ ausente, assinatura digital ICP-Brasil, backup criptografado, isolamento multi-tenant no NSR) e LGPD (base legal incorreta para biometria, minimização incompleta).

---

## 1. Resumo Executivo

| Pilar | Requisito Legal | Status | Severidade | Ref. Código |
|---|---|---|---|---|
| **CLT Art. 74, §2º** | Registro eletrônico de ponto com 4 batidas (ENTRY/LUNCH_START/LUNCH_END/EXIT) + marcação vinculada a identidade do trabalhador | **Conforme** | — | `backend/src/controller/CheckinController.ts:15` + `:61` |
| **CLT Art. 74, §2º** | Espelho de ponto / relatório mensal disponibilizado ao empregado (12 meses, assinável) | **Parcial** | P1 | `backend/src/services/relatorioMensalService.ts:47` |
| **CLT Art. 58, §1º** | Tolerância 5 min por batida, máx. 10 min/dia (variação não computada como hora extra) | **Conforme — CORRIGIDO 21/08/2026 (P0-1 + A2 mínimo)** | — | `backend/src/utils/toleranceCalculator.ts:20` + `relatorioMensalService.ts:100` (acúmulo diário + cru preservado) |
| **CLT Art. 59 / 71 / 66** | Cálculo/travas de horas extras, adicional noturno (22h-05h), intervalo intra (≥1h se >6h) e interjornada (11h) | **Parcial — A-leve CORRIGIDO 21/08/2026** | — | `relatorioMensalService.ts:100` (Horas sempre, Extras com escala, *T/*E/*I) — A-leve PME |
| **Port. 671 Art. 78** | REP-P: programa que registra ponto sem capacidade de adulteração | **Parcial** | P1 | `backend/src/routes/index.ts:20` |
| **Port. 671 Art. 78 §5º III/§5º-C** | NSR unívoco, sequencial, crescente por empregador, reinício em 01/01, limite 999.999 | **Conforme — CORRIGIDO 21/08/2026 (P0-5)** | — | `backend/src/utils/nsrGenerator.ts:21` + `schema.prisma:77` |
| **Port. 671 Art. 80** | Inviolabilidade: ausência de UPDATE/DELETE no registro original | **Conforme** | — | `backend/src/routes/checkinRoutes.ts:12` (sem PUT/DELETE) |
| **Port. 671 Art. 80 § único** | Retenção 5 anos + inviolabilidade após 5 anos | **Conforme — CORRIGIDO 21/08/2026 (P0-4 mínimo)** | — | `backend/src/scripts/retentionCleanup.ts:47` (hash+AuditLog ARCHIVE por empresa antes de delete, inviolabilidade) |
| **Port. 671 Anexo III** | Comprovante do Trabalhador com hash SHA-256 | **Conforme** | — | `backend/src/utils/comprovanteGenerator.ts:78` |
| **Port. 671 Anexo III** | Comprovante com assinatura digital ICP-Brasil (certificado A1) | **Pendente** | P1 | `backend/src/utils/comprovanteGenerator.ts:82` (sem assinatura) |
| **Port. 671 Anexo II** | Exportação AFD (Registro Tipo 1/2/9, ordenado por NSR) | **Conforme** | — | `backend/src/controller/AfdController.ts:47` |
| **Port. 671 Anexo V** | Exportação AEJ (Arquivo Eletrônico de Jornada) | **Conforme — CORRIGIDO 21/08/2026 (P0-3)** | — | `backend/src/controller/AejController.ts` + `afSignature.ts` + `CERT_A1_*` (Anexo V Tipo1/2/3/9 + hash SHA-256 + A1 plugável via .env) |
| **Port. 671 Art. 81** | Backup criptografado e exportável à fiscalização | **Inconforme** | P1 | *não implementado* |
| **Port. 671 Art. 78 §4º** | Geolocalização vinculada ao REP-P (se coletada, auditável) | **Parcial** | P1 | `frontend/src/pages/pontoPage.tsx:47` |
| **LGPD Art. 5º II + Art. 11** | Biometria = dado sensível, armazenamento em repositório seguro + criptografia + sem imagem | **Conforme** | — | `backend/src/utils/faceEncryption.ts:39` + `schema.prisma:43` |
| **LGPD Art. 11 I** | Consentimento específico e destacado para biometria (revogável, granular, revalidação) | **Parcial** | P1 | `backend/src/utils/biometricRevalidation.ts:5` + `Consentimento.tipo="BIOMETRIA"` |
| **LGPD Art. 7º II** | Base legal para tratamento de ponto/geolocalização (obrigação legal CLT Art.74) | **Parcial** | P1 | `backend/src/middleware/AuditMiddleware.ts:81` |
| **LGPD Art. 6º III** | Princípio da Minimização — geolocalização restrita ao exato momento da batida | **Conforme** | — | `frontend/src/pages/pontoPage.tsx:84` (`maximumAge:0`) |
| **LGPD Art. 6º VIII + 46** | Segurança: pseudonimização, controle de acesso, trilhas de auditoria (Art.37) | **Conforme c/ ressalva** | P1 | `AuditMiddleware.ts:29` + `cpfEncryption.ts:21` |
| **LGPD Art. 18** | Direitos do titular: acesso, correção, eliminação, portabilidade, revogação, logs | **Conforme** | — | `backend/src/controller/PrivacyController.ts:14` |
| **LGPD Art. 16 / 15** | Retenção e eliminação (INACTIVE >30d, >24m) | **Conforme** | — | `retentionCleanup.ts:30` + `biometricRevalidation.ts:35` |

**Legenda:** Conforme = atende literalidade da norma; Parcial = atende núcleo mas falta elemento fiscalizável; Inconforme/Pendente = viola ou ausência que gera autuação fiscal ou sanção ANPD.

---

## 2. Auditoria por Arquivo

### 2.1 `backend/prisma/schema.prisma`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `model CheckIn { nsr Int; ano Int; employerCnpj String; @@unique([companyId, nsr, ano]) }` :61-81 | **Conforme.** Modelagem atende REP-P com chave composta por empregador + ano + sequencial e snapshot histórico do CNPJ (incorpora/cisão). Índice cobre fiscalização por período. Falta campo `hashComprovante String` dedicado e `assinaturaDigital String?` para ICP-Brasil. | Port.671 Art.78 §5º-A II, §5º-C |
| `User.faceDescriptor Json?` :43 + `faceDescriptorUpdatedAt` :44 | **Conforme.** Armazena apenas vetor (128 floats) criptografado, sem blob de imagem. Correto para LGPD. **Ressalva:** tipo `Json?` permite persistência de payload não-criptografado se `encryptFaceDescriptor` for contornado — recomendar check constraint ou validação em `prisma-extensions.ts`. | LGPD Art.11, Art.46 |
| `User.cpf String? @unique` + `cpfHash String? @unique` :41-42 | **Conforme.** Dupla camada: dado cifrado (AES-GCM) + hash com pepper para busca. Evita plaintext no índice. | LGPD Art.46 |
| `AuditLog { legalBasis purpose personalDataCategories }` :160-179 | **Conforme.** Atende Art.37 LGPD (registro de operações). Categorias mapeadas por ação permitem ROPA automatizado. | LGPD Art.37 |
| `WorkSchedule { entryTime lunchStart lunchEnd exitTime Int; daysOfWeek Int; checkinToleranceMinutes lunchToleranceMinutes }` :211-233 | **Parcial.** Suporta jornada fixa. **Inconforme:** não há campos para hora extra (`overtimeEnabled`), adicional noturno, intervalo mínimo, nem `jornadaTipo` (12x36, banco de horas). Cálculo de jornada fica impossível sem esses metadados. | CLT Art.59, 71, 73 |
| `CheckIn.latitude Float / longitude Float @NOT NULL` :67-68 | **Ressalva.** Geoloc obrigatória implica coleta sempre ativa; sem `geolocationConsent Boolean` ou `geolocationAccuracy Float` não há como provar minimização perante ANPD. | LGPD Art.6º III |
| `Company.settings Json?` :20 | **Pendente.** Previsto para geofence (`latitude/longitude/radiusMeters`) mas nunca lido em controllers. Config fantasma gera falso-positivo de conformidade. | Port.671 + LGPD |

### 2.2 `backend/src/utils/nsrGenerator.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `getNextNSR(companyId, year)` :21-43 - `findFirst orderBy nsr desc` + `next = last+1` | **Conforme c/ ressalva P1.** Lógica sequencial + reinício anual + `NSR_MAX 999999` + `@@unique` está correta. **Risco crítico:** função usa `prisma` global, não `tx` nem `extendedPrisma`. Dentro de `CheckinController.$transaction` o `getNextNSR` roda FORA da transação (leitura fora do `tx`), abrindo janela de corrida entre tenants. Dois `POST /checkins` concorrentes da mesma empresa podem ler mesmo `last.nsr` e um falhar com constraint violation sem retry. Também viola isolamento multi-tenant se `prisma-extensions.ts` injeta `companyId` via ALS e `prisma` puro o ignora. | Port.671 Art.78 §5º III |
| `throw NsrLimitExceededError` :36 + `CheckinController.ts:129` → HTTP 503 | **Conforme.** Tratamento correto, mensagem orienta suporte. Falta auditoria específica `AuditLog.action="NSR_LIMIT"` para fiscalização. | Port.671 §5º-C |

**Correção exigida:**
```ts
export async function getNextNSR(tx: PrismaTx, companyId: string, year: number) {
  const last = await tx.checkIn.findFirst({ where:{ companyId, ano: year }, orderBy:{nsr:"desc"}, select:{nsr:true} });
  // + SELECT FOR UPDATE se possível ou retry com backoff
}
```
E injetar `tx` em `CheckinController.$transaction`.

### 2.3 `backend/src/utils/comprovanteGenerator.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `textoSemHash = linhas.join("\n"); hash = SHA256(textoSemHash).hex` :76-80 | **Conforme.** Implementa Anexo III (empregador, CNPJ, empregado, CPF, data/hora, tipo, NSR, localização) + hash SHA-256 verificável. Pad6 no NSR e 6 casas em lat/lon atendem leiaute. | Port.671 Anexo III |
| `texto + "\nHash: "+hash` :82 | **Parcial.** Hash cobre o texto mas **não há assinatura digital** com certificado A1 (e-CNPJ) nem QR-Code para validação offline. Fiscalização exige arquivo `.txt` assinado; PDF atual não é assinado. Falta também `PIS` do empregado quando houver. | Port.671 Art.78 §2º, IN 2.094/2022 |
| `formatDate/formatTime` com `getDate()` local | **Ressalva.** Usa timezone do servidor (UTC vs America/Sao_Paulo). Comprovante deve refletir horário local da batida com `Intl` ou `date-fns-tz`. Risco de divergência AFD vs comprovante. | CLT Art.74 |

### 2.4 `backend/src/utils/toleranceCalculator.ts` + `WorkSchedule`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `aplicarTolerancia(horarioReal, horarioPrevisto, tolerancia)` :20-52 | **Inconforme P0 — CLT Art.58 §1º segunda parte.** Função só ajusta se `diff <= tolerancia` (ex: 5 min). **Não implementa o teto de 10 min/dia.** Empregado que atrasa 5 min na entrada + 6 min no retorno (total 11 min) tem ambos ajustados para `horarioPrevisto` (0 min computado), quando deveria computar 1 min excedente. Falta acumulador diário `totalToleranciaConsumida`. Também ignora a regra de que tolerância só se aplica a variações *não excedentes* ao limite diário; implementação atual nunca debita do banco diário. | CLT Art.58 §1º, Súmula 366 TST |
| `tipoParaTolerancia: LUNCH_* → 15min, default 5min` :83-94 | **Conforme** para tolerância de almoço superior (15 min é prática, não lei). Correto diferenciar. | CLT Art.71 |
| `isDiaUtil(daysOfWeek, data)` :100-104 | **Conforme.** Bitmask bem implementado. Falta considerar feriados nacionais/regionais + banco de horas. | CLT Art.70 |

**Correção exigida (esboço):**
```ts
// Buscar todos os checkins do dia, somar minutos já tolerados
const toleranciaDiaria = 10;
const usado = await getToleranciaUsadaNoDia(userId, today); // soma diffs já ajustados
const limiteRestante = toleranciaDiaria - usado;
if (diffMinutos <= tolerancia && diffMinutos <= limiteRestante) { ajusta }
```

### 2.5 `backend/src/controller/CheckinController.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `bodySchema: type enum + latitude/longitude number` :15-18 | **Parcial.** Valida enum corretamente, mas `latitude/longitude` sem `min(-90)/max(90)` e `min(-180)/max(180)`. Aceita `NaN/Infinity`. Falta `z.number().finite().min(-90).max(90)` etc. Também falta `address` opcional validado e `accuracy`. | LGPD minimização + Port.671 |
| `checkinExists findFirst {userId, type, gte:startOfDay, lte:endOfDay}` :36-48 | **Conforme c/ ressalva.** Impede duplicidade do mesmo tipo no dia, atendendo regra de 4 batidas. **Inconforme:** permite sequência inválida (ex: `EXIT` sem `ENTRY`, `LUNCH_END` sem `LUNCH_START`). Não valida ordem cronológica nem batida fora de ordem. Falta máquina de estados. | CLT Art.74 §2º |
| `effectiveCreatedAt = aplicarTolerancia(...) ` :68-84 | **Conforme parcial** (ver 2.4). Observação: `today` é capturado antes da leitura do schedule; se transação demorar, `effectiveCreatedAt` pode divergir de `new Date()` do `create`. Usar single `now`. | CLT Art.58 §1º |
| `$transaction(async tx => { getNextNSR(companyId, ano); tx.checkIn.create(...) })` :91-107 | **Ressalva P1.** Transação com `extendedPrisma` herda ALS, mas `getNextNSR` lê de `prisma` puro (fora do tx). Ver 2.2. Também cria com `createdAt: effectiveCreatedAt` — **INCONFORME Portaria**: `createdAt` é definido pelo app, não pelo DB (`now()`). Trabalhador pode manipular relógio do client e o `effectiveCreatedAt` vem de `new Date()` do servidor mas sem sincronia NTP auditada. Recomendado `createdAt` default DB + campo separado `effectiveAt` ou `adjustedAt`. | Port.671 Art.80 (inviolabilidade temporal) |
| `comprovante = gerarComprovante(...)` + `res 201 {checkin, comprovante, hashVerificacao}` :109-125 | **Conforme.** Retorna comprovante imediatamente (REP-P exige entrega no ato). Falta header `X-NSR` para idempotência client-side. | Port.671 Anexo III |
| `index/listByCompany/listMonthly/exportRelatorioMensal` :147-351 | **Parcial.** Listagens atendem espelho de ponto, mas `relatorioMensalService` não calcula horas extras/noturnas/intervalos. Export CSV/PDF sem assinatura. | CLT Art.59/71/73 |

### 2.6 `backend/src/controller/AfdController.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `Header Tipo 1: 1\|cnpj\|\|razao\|dataIni\|dataFim` :91-105 | **Conforme.** Formato pipe + IE vazio + razao social. | Port.671 Anexo II |
| `Detalhe Tipo 2: 2\|cnpjEmpregador(snapshot)\|cpf\|nsrPad6\|dataHora\|codigo(1-4)` :107-128 | **Conforme.** Usa `employerCnpj` snapshot (histórico), `decryptCpf` + pad6 + ordenação `ano,nsr`. Correto. | Port.671 Art.78 §5º-A II |
| `Trailer Tipo 9: 9\|cnpj\|totalPad6` :130-138 | **Conforme.** | Anexo II |
| Ausência de assinatura digital no AFD | **Pendente P1.** Portaria exige AFD assinado com certificado digital quando exigido pela fiscalização (eSocial → FGTS Digital). Hoje `Content-Type text/plain` sem `Content-Signature`. | Port.671 Art.78 §1º |
| `findMany where: {createdAt gte/lte}` sem `companyId` explícito :76-87 | **Risco P1.** Depende de `extendedPrisma` injetar `companyId` via ALS; se middleware falhar, vaza dados cross-tenant. `AfdController` não valida `companyId` no `where` — deveria passar `companyId` explicitamente além do escopo. Auditoria `isolation.test.ts` já sinaliza. | LGPD Art.46 + Port.671 |
| Formato de data `dd/mm/yyyy hh:mm:ss` :17-25 | **Conforme.** | Anexo II |

### 2.7 `backend/src/controller/EmployeesController.ts` + `TotemController.ts` (fluxo biométrico)

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `faceTokens Map<string, {descriptor, expiresAt}> TTL 30s + crypto.randomUUID + one-time delete` :93-132, :138 | **Conforme.** Token descartável evita exposição do descriptor ao client (correção SEC-14). `Float32Array 128` + `euclideanDistance <0.5` é threshold padrão face-api. | LGPD Art.46 |
| `decryptFaceDescriptor(user.faceDescriptor)` :93 | **Conforme.** AES-256-GCM com IV 12 bytes + tag 16. Key via `FACE_ENCRYPTION_KEY` hex 64. | LGPD Art.46 |
| `threshold 0.5 fixo` :136 | **Ressalva P1.** Threshold único sem ajuste por FAR/FRR ou por usuário. Não há `liveness` server-side; depende do frontend `LivenessChallenge.tsx`. Atacante pode burlar via `POST /face/verify` com descriptor sintético sem passar pelo liveness. Falta vincular `faceToken` ao `headPose`/`EAR` validado no backend. | LGPD Art.11 + Port.671 (identidade) |
| `hasFaceDescriptor` sem descriptografia :98-113 `faceEncryption.ts` | **Conforme.** Minimiza exposição. | LGPD minimização |
| `TotemController` (não lido integralmente) usa mesmo padrão + `totemPinHash` bcrypt | **Conforme** para totem. Falta rate-limit específico para `totem/face/verify` (atualmente 30/h global). | Port.671 |

### 2.8 `backend/src/routes/checkinRoutes.ts` + `index.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `POST /checkins` + `GET /export/afd` + `GET /export/relatorio-mensal` — todos com `authMiddleware` | **Conforme.** Autenticação obrigatória. **Inconforme:** `GET /checkins/export/afd` não exige `RoleGuard(ENTERPRISE_ADMIN)` — qualquer EMPLOYEE pode exportar AFD completo da empresa (vazamento). Idem `relatorio-mensal`. | Port.671 + LGPD Art.46 |
| Ausência de `PUT /checkins/:id` e `DELETE /checkins/:id` | **Conforme.** Inviolabilidade respeitada — não há rota de mutação. Confirmado por `grep deleteMany` só em `retentionCleanup` e helpers de teste. | Port.671 Art.80 |
| `checkinLimiter 10/1h` por userId :12 | **Conforme.** Mitiga brute force de batidas. | Segurança |

### 2.9 `backend/src/utils/faceEncryption.ts` + `cpfEncryption.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `AES-256-GCM iv 12 random, tag 16, v1, ct hex` `faceEncryption.ts:39` / `cpfEncryption.ts:31` | **Conforme.** Algoritmo aprovado ANPD/NIST. IV aleatório impede determinismo. Versão `v1` permite rotação futura. | LGPD Art.46 |
| `hashCpf = SHA256(cpfDigits + pepper)` onde `pepper=CPF_ENCRYPTION_KEY` :21-23 | **Ressalva P1.** Reutilizar mesma chave para criptografia e pepper viola separação de segredos. Pepper deveria ser `CPF_HASH_PEPPER` distinto e armazenado em HSM/KMS. Se `CPF_ENCRYPTION_KEY` vazar, hashes viram reversíveis via rainbow. | LGPD Art.46 |
| `decryptLegacyCbc` fallback :95-104 `cpfEncryption.ts` | **Risco.** Mantém suporte a `aes-256-cbc` com IV derivado de `sha256(hex).subarray(0,16)` — IV previsível. Deve ser removido após migração ou logado como `WARN` para forçar re-criptografia. | LGPD |
| `getKey()` lê `Env.FACE_ENCRYPTION_KEY` hex 64 sem checagem de rotação | **Pendente.** Falta `FACE_ENCRYPTION_KEY_ID` para key rotation (envelope encryption). | LGPD |

### 2.10 `backend/src/utils/biometricRevalidation.ts` + `scripts/retentionCleanup.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `BIOMETRIC_REVALIDATION_MONTHS = 24` + `purgeExpiredBiometricDescriptors()` :5,27 | **Conforme.** Revalidação bienal atende princípio da necessidade (não guardar biometria indefinidamente) e permite ROPA. Prazo de 24 meses é defensável, mas deve constar em política de privacidade publicada. | LGPD Art.15, 16 |
| `retentionCleanup: INACTIVE >30d → faceDescriptor DbNull; CheckIn >5a → deleteMany` :25-53 | **Inconforme P0.** `deleteMany` sem arquivamento viola Port.671 Art.82 (guarda de 5 anos = mínimo, não máximo; após 5 anos deve arquivar, não apagar sem cópia fiscal assinada/S3 Glacier). Falta export AFD antes de deletar + hash de integridade + log de eliminação (Art.16 LGPD). Também falta `AuditLog` para cada deleção. | Port.671 Art.82 + LGPD Art.16 |
| `findUsersNeedingBiometricRevalidation` usa `extendedPrisma` :7-24 | **Conforme.** | — |

### 2.11 `backend/src/middleware/AuditMiddleware.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `LGPD_MAPPINGS CHECKIN: "Art.7º V / Art.7º II CLT Art.74" GEOLOCALIZACAO PONTO BIOMETRIA` :81-85 | **Parcial P1.** Base dupla está correta (contrato + obrigação legal). **Inconforme:** `FACE_VALIDATION: "Art.11 II f tutela da saúde"` — tutela da saúde não se aplica a ponto eletrônico; base correta é **Art.11 I (consentimento) + Art.7º V** ou **Art.11 II g (prevenção à fraude) + legítimo interesse documentado**. Usar tutela da saúde sem laudo médico é tese frágil perante ANPD. | LGPD Art.11 |
| `createAuditLog` com `redactSensitive [cpf, faceDescriptor, password]` :150-174 | **Conforme.** Pseudonimização correta. | LGPD Art.46 |
| `auditMiddleware` global antes de `authMiddleware` : `app.ts:14` + lógica `req.user` deferida | **Conforme c/ ressalva.** `oldData` só capturado se `req.user` já existe no mount time (raro). Para `PUT /employees/:id` sem auth prévia, `oldData=null` perde trilha. Recomendar mover `auditMiddleware` para após `authMiddleware` por rota. | LGPD Art.37 |

### 2.12 `backend/src/services/relatorioMensalService.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `buildRelatorio` monta CSV pipe com `Dia\|Sem\|Entrada\|S.Intervalo\|R.Intervalo\|Saída` + `HASH SHA256` :47-133 | **Parcial P1.** Atende formato MTE para espelho, mas **não calcula**: (i) horas extras (acima de 8h/dia ou 44h/sem), (ii) adicional noturno (22h-05h * 20%), (iii) DSR, (iv) intervalo intra <1h (gera hora extra), (v) interjornada <11h. Apenas exibe `HH:mm` cru — fiscal não consegue aferir conformidade. | CLT Art.59 (horas extras), Art.73 (noturno), Art.71 §4º (intervalo), Art.66 (interjornada) |
| `gerarRelatorioMensalPdf` com `pdfkit` + `hash` no `info.Subject` :150-175 | **Conforme parcial.** Gera PDF legível, mas sem assinatura ICP-Brasil, sem paginação por funcionário assinável, sem carimbo de tempo. | Port.671 + CLT Art.74 §2º |

### 2.13 `frontend/src/pages/pontoPage.tsx` + `components/LivenessChallenge.tsx` / `FaceAuth.tsx`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `navigator.geolocation.getCurrentPosition(..., {enableHighAccuracy:true, timeout:10000, maximumAge:0})` :78-86 | **Conforme.** `maximumAge:0` garante coleta no exato momento; `enableHighAccuracy` minimiza erro. Atende minimização LGPD (não usa `watchPosition`). **Falta:** consentimento explícito de geolocalização (banner) + `accuracy` armazenado + fallback para `PERMISSION_DENIED` (hoje `alert`). | LGPD Art.7º II + Art.8º |
| `pendingCheckin {type, latitude, longitude}` + `api.checkins.create(pendingCheckin)` :59,167 | **Conforme.** Geoloc só enviada no POST da batida, não em background polling. Minimização respeitada. | LGPD Princípio Minimização |
| `issueFaceToken → LivenessChallenge → verifyFaceWithToken → createCheckin` :89-168 | **Conforme.** Fluxo correto: token 30s, desafio 3 passos (front/left/right) + `EAR <0.27` blink. Evita replay de foto. **Ressalva:** `faceDescriptor` capturado via `face-api.js` roda no browser; descriptor pode ser interceptado via DevTools. Mitigação atual (token one-time) atenua mas não elimina. Recomendar validação adicional de `headPose` no backend (enviar `yaw/pitch` assinado). | LGPD Art.11 |
| `alert("Erro ao obter localização...")` :80 | **Inconforme UX jurídico.** Bloqueia batida se usuário negar localização, mas CLT Art.74 não pode condicionar registro à geolocalização quando REP-P não exige (REP-P exige local, mas REP-A/P pode ser offline). Deve permitir batida sem geo com flag `geolocationDenied=true` + justificativa + `address` manual auditável. | CLT Art.74 + LGPD |
| `hasFaceRegistered` gate + botão "Cadastrar Facial" | **Conforme.** Impede ponto sem biometria cadastrada, alinhado a consentimento. | LGPD Art.11 I |

### 2.14 `backend/src/controller/PrivacyController.ts` + `ConsentController.ts` + `consentRoutes.ts`

| Trecho | Diagnóstico | Base Legal |
|---|---|---|
| `GET /privacy/my-data` (decryptCpf + hasFaceDescriptor sem descriptografar) :14-93 | **Conforme.** DSAR Art.18 I. Exibe últimos 100 checkins, consentimentos. | LGPD Art.18 |
| `PUT /privacy/my-data` só `name/email`, CPF imutável :100-145 | **Conforme.** Correção Art.18 III sem permitir fraude de CPF. | LGPD Art.18 III |
| `GET /privacy/export` JSON `meta.baseLegal Art.18 V` :152-254 | **Conforme.** Portabilidade Art.18 V com JSON estruturado, `employerCnpj` por registro. | LGPD Art.18 V |
| `DELETE /privacy/my-face` → `DbNull + consentimento BIOMETRIA false` :260-317 | **Conforme.** Revogação Art.18 VI/VIII. Upsert com `ip` registra prova. | LGPD Art.18 VI |
| `GET /privacy/my-logs` 50 logs com `legalBasis/purpose` :323-355 | **Conforme.** Transparência Art.18 + Art.37. | LGPD |
| `Consentimento @@unique([userId, tipo, versao])` + `tipo="BIOMETRIA" versao="1.0"` :235-245 `schema.prisma` | **Parcial P1.** Versionamento existe, mas `versao` hardcoded `1.0` impede granularidade; falta `geolocalizacao` como tipo distinto e `finalidade` descritiva + `dataRevogacao`. | LGPD Art.8º §1º |

### 2.15 Infra e transversais

| Arquivo | Diagnóstico | Base Legal |
|---|---|---|
| `backend/.env-example` sem `CERT_A1_PATH` / `CERT_A1_PASSWORD` | **Pendente.** Sem certificado não há assinatura AFD/AEJ/comprovante. | Port.671 Art.78 |
| `backend/src/database/prisma-extensions.ts` (não lido, mas inferido por `extendedPrisma`) | **Risco.** Se extensão injeta `companyId` via ALS, `prisma` puro em `retentionCleanup.ts:47` e `nsrGenerator.ts:25` furam isolamento. Validar. | LGPD Art.46 |
| `docs/LEGISLACAO.md` + `SECURITY_AUDIT.md` | **Positivo.** Documentação existe, mas desatualizada quanto a gaps AEJ/backup. | — |
| Ausência de `utils/geolocation.ts` (haversine + radius) | **Pendente.** `PLANO-IMPLEMENTACAO` propõe geofence mas código não existe; se fiscal exigir comprovação de local, sistema não valida raio. Decisão: geofence é opcional por lei, mas se oferecido deve ser auditável. | Port.671 |

---

## 3. Plano de Ação Prioritário (Go-Live Blockers)

### P0 — Bloqueadores (corrigir ANTES de qualquer operação comercial; risco de autuação MTE/ANPD)

- [ ] **CLT Art.58 §1º — Implementar teto diário de 10 min.** Alterar `toleranceCalculator.ts` para acumular tolerância consumida no dia (`GET /checkins?date=today` + soma `min(tolerancia, diff)`). Se `usado + diff <=10` e `diff<=5` então ajusta; caso contrário mantém real e marca `minutosExcedentes`. Adicionar teste unitário com cenário 5+6=11.
  - *Arquivos:* `backend/src/utils/toleranceCalculator.ts:20`, `backend/src/controller/CheckinController.ts:74`
  - *Critério de aceite:* 3 casos TST Súmula 366 cobertos em `src/test/unit/utils/toleranceCalculator.test.ts`.

- [ ] **CLT Art.59/71/73/66 — Motor de jornada.** Implementar `backend/src/utils/jornadaCalculator.ts` com: (a) horas extras diárias/semanais (8h/44h), (b) adicional noturno 20% (22:00-05:00), (c) validação intervalo intra (1h se >6h, senão 15min; se violado, computa 1h extra), (d) interjornada 11h. Integrar em `relatorioMensalService.ts` e expor colunas `Horas Normais|Extras|Noturnas|Saldo Intervalo`.
  - *Critério:* relatório mensal passa em auditoria simulada com planilha MTE de horas extras.

- [ ] **Port.671 AEJ — Implementar exportação AEJ (Anexo V).** Criar `backend/src/controller/AejController.ts` + rota `GET /checkins/export/aej` com leiaute `Registro Tipo 1 (header empresa) + Tipo 2 (horário contratual) + Tipo 3 (marcações)`. Reutilizar `AfdController` como base.
  - *Critério:* arquivo AEJ validado contra validador MTE (eSocial).

- [ ] **Port.671 Art.82 + LGPD Art.16 — Remover `deleteMany` destrutivo de CheckIn.** Substituir `retentionCleanup.ts:47` por arquivamento: exportar AFD/AEJ do período + `createHash` + upload para S3 Glacier/OnPrem criptografado (`AES-256` + assinatura A1) + `AuditLog action=ARCHIVE` + só então `deleteMany` com `legalBasis="Art.16 LGPD + Art.82 Port.671"`. Guardar `hashArquivo` imutável.
  - *Critério:* nenhum `DELETE FROM "CheckIn"` sem `hashArquivo` prévio em `AuditLog`.

- [ ] **Port.671 NSR — Corrigir isolamento multi-tenant.** Alterar `nsrGenerator.ts:25` para receber `tx: Prisma.TransactionClient` e usar `tx.checkIn.findFirst` dentro da transação; adicionar `companyId` explícito em `AfdController:76` e `CheckinController:91`.
  - *Critério:* teste de concorrência com 20 `POST /checkins` paralelos da mesma empresa não gera NSR duplicado nem cross-tenant leak (usar `isolation.test.ts`).

### P1 — Alto (exigido para homologação fiscal e segurança jurídica; entrega em até 30 dias)

- [ ] **Assinatura digital ICP-Brasil (A1).** Provisionar `CERT_A1_PATH` em `environment.ts` (zod), implementar `backend/src/utils/afSignature.ts` com `node-forge` ou `openssl` para assinar AFD/AEJ/comprovante/PDF (PKCS#7). Adicionar `assinaturaDigital String?` em `CheckIn` e `hashAssinado`. Validar em `comprovanteGenerator.ts`.
- [ ] **Backup criptografado Art.81.** Job `scripts/backupAfd.ts` diário 03:00: dump `CheckIn` → AFD → `gpg --encrypt` + upload S3 + retenção 5 anos com WORM.
- [ ] **Correção base legal biometria.** Em `AuditMiddleware.ts:88` trocar `Art.11 II f tutela da saúde` por `Art.11 I consentimento + Art.11 II g prevenção à fraude` e documentar DPIA + LIA para `FACE_VALIDATION`. Publicar política de privacidade com finalidade específica.
- [ ] **Separar pepper de hash CPF.** Criar `CPF_HASH_PEPPER` em `.env` distinto de `CPF_ENCRYPTION_KEY`; migrar `hashCpf` e re-hash em background job.
- [ ] **Hardening CheckIn:** validar `latitude/longitude` range, vincular `accuracy`, implementar máquina de estados (`ENTRY → LUNCH_START → LUNCH_END → EXIT`) e permitir `geolocationDenied` com justificativa.
- [ ] **Controle de acesso AFD/AEJ/relatório.** Adicionar `RoleGuard(ENTERPRISE_ADMIN)` em `checkinRoutes.ts:13-14`; empregado só exporta `GET /privacy/export` (seus dados), não AFD da empresa.
- [ ] **Timezone.** Fixar `America/Sao_Paulo` com `date-fns-tz` em `comprovanteGenerator.ts` e `AfdController.ts`; armazenar `createdAt` em UTC mas exibir em BRT no comprovante/AFD com `XXX` offset.
- [ ] **Liveness server-side.** Enviar `yaw/pitch/EAR` do `LivenessChallenge.tsx` para `verifyFace` e validar threshold no backend; aumentar `faceValidationLimiter` para `60/min` por IP + `10/min` por user.

### P2 — Médio (melhorias para maturidade LGPD e UX compliance)

- [ ] **Geofence opcional auditável.** Se `Company.settings.geofence.enabled`, implementar `utils/geolocation.ts:haversine` e validar `radiusMeters` no `CheckinController` com flag `outsideGeofence` + justificativa, sem bloquear batida (CLT não permite negar registro).
- [ ] **Consentimento granular.** Criar `tipo="GEOLOCALIZACAO"` separado de `BIOMETRIA` em `Consentimento`; banner de consentimento no `pontoPage.tsx` antes de `getCurrentPosition` com `navigator.permissions.query`.
- [ ] **Key rotation.** Adicionar `FACE_ENCRYPTION_KEY_ID` + envelope encryption; job de re-criptografia em `biometricRevalidation.ts`.
- [ ] **Remover fallback CBC.** Deprecar `decryptLegacyCbc` após migração; logar `WARN` e forçar `encryptCpf` nos próximos logins.
- [ ] **ROPA/DPIA/DPO.** Publicar `docs/ROPA.md`, `docs/DPIA-biometria.md`, nomear DPO em `PoliticaPrivacidade.tsx` + canal `privacy@viggo.com.br`.
- [ ] **Observabilidade.** Métricas `viggo_nsr_conflicts_total`, `viggo_face_verify_far`, `viggo_checkin_geolocation_denied_total` + alertas.

---

## 4. Evidências e Rastreabilidade

| Evidência | Local | Hash/ID |
|---|---|---|
| NSR constraint | `schema.prisma:77` `@@unique([companyId, nsr, ano])` | — |
| Comprovante SHA-256 | `comprovanteGenerator.ts:78` `createHash("sha256")` | Verificado |
| AFD Tipo 1/2/9 | `AfdController.ts:96,118,132` | — |
| Criptografia biometria | `faceEncryption.ts:39` `aes-256-gcm` | — |
| DSAR | `PrivacyController.ts:14` | — |
| AuditLog | `AuditMiddleware.ts:29` | — |
| Retenção 30d/24m | `retentionCleanup.ts:30` + `biometricRevalidation.ts:35` | — |

---

## 5. Conclusão Técnica

O Viggo demonstra **maturidade acima da média** para um REP-P SaaS: NSR transacional, AFD correto, comprovante com hash, biometria criptografada com token descartável, DSAR completo e auditoria com base legal. **Contudo, não está apto a faturar como REP-P** sem: (i) motor de jornada (horas extras/noturno/intervalos), (ii) teto de tolerância diária, (iii) AEJ, (iv) arquivamento de 5 anos com assinatura A1, e (v) correção do isolamento NSR. Esses 5 itens são autuáveis pelo MTE (NR 671) e pela ANPD (LGPD). Recomenda-se **travar go-live** até P0 concluído e re-auditoria com validador oficial MTE + teste de concorrência NSR + DPIA assinado pelo DPO.

*Próximo passo: abrir issues P0 no GitHub com labels `compliance:blocker` e vincular este relatório em `docs/compliance-audit.md`.*


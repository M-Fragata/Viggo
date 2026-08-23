# Plano de Implementação — Sistema de E-mails Transacionais Viggo

> **Status:** ✅ Fase 1 concluída + Fase 2 parcial (itens 5,6,7,10) concluída — atualizado em 2026-08-23  
> **Provedor:** Resend  
> **Idioma:** pt-BR  
> **Autor:** Análise Muse Spark + decisões do solicitante

---

## Índice

1. [Decisões Consolidadas](#1-decisões-consolidadas)
2. [Escopo MVP (Fase 1) — ✅ Concluído](#2-escopo-mvp-fase-1--concluído)
3. [Fase 2 — ✅ Parcial (10,5,6,7) + ⏳ Pendentes](#3-fase-2--parcial-10567--pendentes)
4. [Arquitetura Geral](#4-arquitetura-geral)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [Estrutura de Arquivos — Atualizada](#6-estrutura-de-arquivos--atualizada)
7. [Design System de E-mail (HTML Viggo)](#7-design-system-de-e-mail-html-viggo)
8. [Templates — Especificação Detalhada](#8-templates--especificação-detalhada)
9. [Pontos de Integração no Código — Atualizado](#9-pontos-de-integração-no-código--atualizado)
10. [Crons e Jobs Agendados — Atualizado](#10-crons-e-jobs-agendados--atualizado)
11. [Fluxo de Envio e Resiliência](#11-fluxo-de-envio-e-resiliência)
12. [LGPD, Deliverability e Boas Práticas](#12-lgpd-deliverability-e-boas-práticas)
13. [Plano de Implementação Passo a Passo — Atualizado](#13-plano-de-implementação-passo-a-passo--atualizado)
14. [Testes e Validação](#14-testes-e-validação)
15. [Riscos e Mitigações](#15-riscos-e-mitigações)
16. [Checklist Final — Atualizado](#16-checklist-final--atualizado)
17. [Apêndice — Exemplo de Código](#17-apêndice--exemplo-de-código)

---

## 1. Decisões Consolidadas

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | Provedor | **Resend** (`npm install resend`) — instalado em `backend/package.json` |
| 2 | Remetente / teste | Variável `.env` `EMAIL_FROM`; em TEST/Homolog usar `dragonbolad@gmail.com` como `EMAIL_TEST_TO` (override). Em PROD usar `Viggo <noreply@viggo.com.br>` após verificação de domínio no Resend. **Nota atual:** sem domínio verificado o Resend só entrega para o e-mail dono da chave (`matheusdemoraes2@gmail.com`); `backend/.env` temporariamente com `EMAIL_TEST_TO=matheusdemoraes2@gmail.com` + `EMAIL_FROM="Viggo <onboarding@resend.dev>"` |
| 3 | Convites | **Fluxo manual mantido**. Não enviar e-mail automático em `createInviteToken`. Link continua sendo copiado pelo admin. Template `inviteCreated` ainda não criado, flag `EMAIL_INVITE_ENABLED=false` |
| 4 | Trial | Avisos em **D-3 e D-1** apenas. `D-7` e `D-0` descartados nesta fase. WhatsApp fica para futuro |
| 5 | Biometria | **Somente quando está vencendo** (janela 23-24 meses) + **quando purgada** (24 meses, LGPD). **NÃO** quando usuário cria conta |
| 6 | Idioma | **pt-BR apenas** |
| 7 | MVP | **Confirmado**: 7 e-mails Fase 1 + 6 e-mails Fase 2 (itens 5,6,7,10) — ver §2 e §3 |

---

## 2. Escopo MVP (Fase 1) — ✅ Concluído

Sete templates obrigatórios. Todos com `subject` + `html` (table-based, inline CSS) + `text` fallback. **Todos implementados e testados com envio real via Resend.**

| # | Template ID | Trigger | Destinatário | Status |
|---|-------------|---------|--------------|--------|
| 1 | `welcome-company` | `CompanyController.signup` sucesso | `email` do `ENTERPRISE_ADMIN` criador | ✅ `templates/welcomeCompany.ts` + `emailService.sendWelcomeCompany` |
| 2 | `trial-ending-3d` | Cron diário, `planExpiresAt = hoje + 3 dias`, `status=TRIAL` | Todos `ENTERPRISE_ADMIN` | ✅ `templates/trialEnding.ts` (param `daysRemaining=3`) |
| 3 | `trial-ending-1d` | Cron diário, `planExpiresAt = hoje + 1 dia`, `status=TRIAL` | Todos `ENTERPRISE_ADMIN` | ✅ `templates/trialEnding.ts` (param `daysRemaining=1`) |
| 4 | `payment-confirmed` | Webhook Asaas `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` | Todos `ENTERPRISE_ADMIN` | ✅ `templates/paymentConfirmed.ts` |
| 5 | `payment-overdue` | Webhook Asaas `PAYMENT_OVERDUE` (vira `SUSPENDED`) | Todos `ENTERPRISE_ADMIN` | ✅ `templates/paymentOverdue.ts` |
| 6 | `justificativa-created` | `JustificativaController.create` | Todos `ENTERPRISE_ADMIN` | ✅ `templates/justificativaCreated.ts` |
| 7 | `justificativa-decided` | `JustificativaController.approve` (`aprovado=true/false`) | `user.email` dono | ✅ `templates/justificativaDecided.ts` |
| 8 | `biometric-expiring` | Cron diário, `faceDescriptorUpdatedAt < -23 meses` e `faceRevalidationNotifiedAt is null` | `User.email` | ✅ `templates/biometricExpiring.ts` + `jobs/biometricExpiringJob.ts` |

> `trial-ending-3d` e `trial-ending-1d` compartilham o mesmo arquivo com `daysRemaining` (3 ou 1).

---

## 3. Fase 2 — ✅ Parcial (10,5,6,7) + ⏳ Pendentes

Solicitação: implementar itens **10, 5, 6, 7** da lista anterior. **Todos concluídos.**

| Item original | Template | Trigger | Status |
|---------------|----------|---------|--------|
| **10** | `reset-password` (código 6 dígitos) | `POST /auth/forgot-password` → `POST /auth/verify-reset-code` → `POST /auth/reset-password` | ✅ `templates/resetPassword.ts` + `controller/ForgotPasswordController.ts` + `prisma User resetCode*` + `routes/authRoutes.ts` (com `authLimiter`). Ver `PLAN_FORGOT_PASSWORD.md` |
| **5a** | `employee-welcome` | `CompanyController.acceptInvite` sucesso | ✅ `templates/employeeWelcome.ts` + `emailService.sendEmployeeWelcome` |
| **5b** | `biometric-purged` | `purgeExpiredBiometricDescriptors()` (24 meses, LGPD) | ✅ `templates/biometricPurged.ts` + `utils/biometricRevalidation.ts:35` (envio após `$transaction`) |
| **6** | `payment-upcoming-3d/1d` | Cron diário `Payment where status=PENDING` com `dueDate` em D+3/D+1 | ✅ `templates/paymentUpcoming.ts` + `jobs/paymentUpcomingJob.ts` + cron `0 8 * * *` em `server.ts` |
| **7** | `subscription-cancelled` | `PaymentController.cancelSubscription` + webhook `SUBSCRIPTION_DELETED/INACTIVATED` | ✅ `templates/subscriptionCancelled.ts` + `emailService.sendSubscriptionCancelled` |

**Ainda pendentes (não solicitados nesta rodada):**

| Template | Trigger | Obs |
|----------|---------|-----|
| `invite-created` | `createInviteToken` | Não criado — fluxo manual mantido, `EMAIL_INVITE_ENABLED=false` |
| `totem-activated` | `TotemController.activate/deactivate` | Operacional, não priorizado |
| `weekly-digest` | Cron segunda 08h | Resumo admin, futuro |
| `whatsapp-*` | Futuro | Canal adicional, mesma base de templates |
| `EmailLog` model | `prisma/schema.prisma` | Tabela opcional de auditoria (`to`, `template`, `status`) — não criada |
| Frontend `ForgotPasswordPage.tsx` | `frontend/src/pages/` | Backend pronto, frontend ainda não implementado (ver `PLAN_FORGOT_PASSWORD.md:208`) |

---

## 4. Arquitetura Geral

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────┐
│  Controllers /  │────▶│  emailService    │────▶│  Resend  │
│  Crons / Webhook│ fire│  (fachada)       │     │  API     │
└─────────────────┘     │  - send()        │     └──────────┘
                        │  - sendBulk()    │
                        │  - preview()     │     ┌──────────┐
                        └──────┬───────────┘     │ Templates│
                               │                 │  *.ts    │
                               ▼                 │  layout  │
                        ┌──────────────┐         └──────────┘
                        │ emailProvider│
                        │ interface    │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │resendProvider│
                        └──────────────┘
```

**Implementado:**

- **Abstração por interface** `EmailProvider` (`services/email/emailProvider.ts`) — troca Resend → SES sem tocar controllers.
- **Fire-and-forget** com `void` + `catch` + `console.error` em todos os controllers/jobs (não bloqueia `res.json()`).
- **Idempotência de cron** por janela exata de dias (`isSameDay` + `startOfDay`) + log de `companyId`/`paymentId`.
- **Feature flags** `EMAIL_ENABLED`, `EMAIL_PREVIEW`, `EMAIL_INVITE_ENABLED`.

---

## 5. Variáveis de Ambiente

### 5.1 `backend/.env-example` — já atualizado

```ini
# ── E-mail Transacional (Resend) ─────────────────────────────
# Gere em https://resend.com/api-keys
RESEND_API_KEY=
# Remetente verificado no Resend (precisa verificar domínio viggo.com.br)
EMAIL_FROM="Viggo <noreply@viggo.com.br>"
EMAIL_REPLY_TO="suporte@viggo.com.br"
# Flag global — false desativa todos os envios (útil em TEST)
EMAIL_ENABLED=true
# Se true, não chama Resend; apenas loga HTML no pino (dev)
EMAIL_PREVIEW=false
# Em ambiente de teste/homolog, força todos os envios para este endereço
# Deixe vazio em produção para enviar ao destinatário real
EMAIL_TEST_TO=dragonbolad@gmail.com
# Flags por template (opcional, default true se omitido)
EMAIL_INVITE_ENABLED=false
```

### 5.2 `backend/src/utils/environment.ts` — já estendido

```ts
RESEND_API_KEY: z.string().optional(),
EMAIL_FROM: z.string().default("Viggo <noreply@viggo.com.br>"),
EMAIL_REPLY_TO: z.string().optional(),
EMAIL_ENABLED: z.preprocess((v) => v === undefined ? true : String(v).toLowerCase() === "true" || String(v) === "1", z.boolean().default(true)),
EMAIL_PREVIEW: z.preprocess((v) => v === undefined ? false : String(v).toLowerCase() === "true" || String(v) === "1", z.boolean().default(false)),
EMAIL_TEST_TO: z.string().email().optional().or(z.literal("")).optional(),
EMAIL_INVITE_ENABLED: z.preprocess((v) => v === undefined ? false : String(v).toLowerCase() === "true" || String(v) === "1", z.boolean().default(false)),
```

> Correção de `z.coerce.boolean()` (que tratava `"false"` como `true`) para `z.preprocess`.

### 5.3 Uso de `EMAIL_TEST_TO` — estado atual

- **Homolog/DEV atual:** `backend/.env` com `EMAIL_TEST_TO=matheusdemoraes2@gmail.com` e `EMAIL_FROM="Viggo <onboarding@resend.dev>"` — necessário porque sem domínio verificado o Resend só entrega para o e-mail dono da chave (erro 403 `You can only send testing emails to your own email address`).
- **Após verificar domínio em `resend.com/domains`:** trocar para `EMAIL_FROM="Viggo <noreply@viggo.com.br>"` e `EMAIL_TEST_TO=dragonbolad@gmail.com` (ou remover para envio real).
- Enquanto `EMAIL_TEST_TO` preenchido, todo `to` é substituído com log `[Email] Redirect: original → testTo`.

---

## 6. Estrutura de Arquivos — Atualizada

```
backend/
├── src/
│   ├── services/
│   │   └── email/
│   │       ├── emailProvider.ts       # interface EmailProvider
│   │       ├── resendProvider.ts      # implementação Resend (payload condicional text/replyTo)
│   │       └── emailService.ts        # fachada + resolveTo + isEnabled + 13 métodos send*
│   ├── templates/
│   │   ├── layout.ts                  # baseLayout() — header #0a0a0a + card #f7f7f7 + CTA pill #00d4a4
│   │   ├── welcomeCompany.ts          # #1 ✅
│   │   ├── trialEnding.ts             # #2 + #3 ✅
│   │   ├── paymentConfirmed.ts        # #4 ✅
│   │   ├── paymentOverdue.ts          # #5 ✅
│   │   ├── justificativaCreated.ts    # #6 ✅
│   │   ├── justificativaDecided.ts    # #7 ✅
│   │   ├── biometricExpiring.ts       # #8 ✅
│   │   ├── resetPassword.ts           # ✅ Fase 2 (10)
│   │   ├── employeeWelcome.ts         # ✅ Fase 2 (5a)
│   │   ├── biometricPurged.ts         # ✅ Fase 2 (5b)
│   │   ├── paymentUpcoming.ts         # ✅ Fase 2 (6)
│   │   └── subscriptionCancelled.ts   # ✅ Fase 2 (7)
│   ├── jobs/
│   │   ├── trialEndingJob.ts          # cron D-3 / D-1 ✅
│   │   ├── biometricExpiringJob.ts    # cron biometria 30d antes ✅
│   │   └── paymentUpcomingJob.ts      # cron pagamento D-3/D-1 ✅ Fase 2
│   ├── controller/
│   │   ├── company/CompanyController.ts  # signup + acceptInvite com e-mails ✅
│   │   ├── payment/PaymentController.ts  # webhook + cancel com e-mails ✅
│   │   ├── JustificativaController.ts    # create/approve com e-mails ✅
│   │   └── ForgotPasswordController.ts   # ✅ Fase 2 (10)
│   └── routes/
│       ├── authRoutes.ts              # ✅ +3 rotas forgot
│       └── devRoutes.ts               # ✅ 15 previews (DEV only)
└── prisma/
    └── schema.prisma                  # ✅ User.resetCode* + db push executado
```

- `components.ts` / `index.ts` previstos mas não necessários — `layout.ts` já centraliza.
- `EmailLog` ainda não criado (opcional P2).

---

## 7. Design System de E-mail (HTML Viggo)

### 7.1 Tokens (de `frontend/src/index.css:3-36` e `DESIGN.md`)

| Token | Valor | Uso no e-mail |
|-------|-------|---------------|
| `primary` | `#0a0a0a` | Header bg, títulos, botão texto |
| `brand-green` | `#00d4a4` | CTA bg, links, acentos |
| `brand-green-deep` | `#00b48a` | CTA hover, borda |
| `canvas` | `#ffffff` | Fundo do body |
| `surface` | `#f7f7f7` | Card bg |
| `hairline` | `#e5e5e5` | Bordas, divider |
| `stone` | `#888888` | Texto secundário, footer |
| `ink` | `#0a0a0a` | Texto principal |

Fonte: `Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`.

### 7.2 Layout Base (`templates/layout.ts`)

Table-based 600px, compatível com Gmail/Outlook/Apple Mail — já implementado com header `#0a0a0a`, hero, card `#f7f7f7`, CTA pill `9999px`, footer com Termos/Privacidade/DPA + DPO, `text` fallback.

---

## 8. Templates — Especificação Detalhada

Todos em `pt-BR`, já implementados com `subject` + `html` + `text`.

### 8.1 `welcome-company` ✅
- **Subject:** `Bem-vindo à Viggo, {{companyName}} — seu trial de 30 dias começou`
- **Props:** `{ adminName, companyName, trialExpiresAt }`

### 8.2 `trial-ending` ✅
- **Subject D-3:** `Seu trial Viggo termina em 3 dias — ative seu plano`
- **Subject D-1:** `Último dia do seu trial Viggo — ative agora e não perca seus dados`
- **Props:** `{ companyName, daysRemaining: 3|1, planExpiresAt }`

### 8.3 `payment-confirmed` ✅
- **Subject:** `Pagamento confirmado — Viggo {{amount | BRL}}`

### 8.4 `payment-overdue` ✅
- **Subject:** `Pagamento em atraso — regularize sua assinatura Viggo`

### 8.5 `justificativa-created` ✅
- **Subject:** `Nova justificativa: {{tipo}} — {{employeeName}}`

### 8.6 `justificativa-decided` ✅
- **Subject aprovado:** `Justificativa aprovada — {{tipo}}` / **reprovado:** `Justificativa não aprovada — {{tipo}}`

### 8.7 `biometric-expiring` ✅
- **Subject:** `Sua biometria facial expira em 30 dias — revalide seu acesso`
- **Regra:** `faceDescriptorUpdatedAt < -23 meses` + `faceRevalidationNotifiedAt is null` + `daysUntilExpiry 20-35`

### 8.8 `reset-password` ✅ Fase 2
- **Subject:** `Código de redefinição de senha - Viggo`
- **Props:** `{ code: "6 dígitos" }` — expira 10min, 5 tentativas, código com `letter-spacing:8px` em card branco

### 8.9 `employee-welcome` ✅ Fase 2
- **Subject:** `Bem-vindo à {{companyName}} — seu acesso Viggo está pronto`
- **Props:** `{ employeeName, companyName }`

### 8.10 `biometric-purged` ✅ Fase 2
- **Subject:** `Sua biometria foi removida — revalidação necessária`
- **Props:** `{ userName }` — LGPD 24 meses

### 8.11 `payment-upcoming` ✅ Fase 2
- **Subject D-3:** `Lembrete: pagamento Viggo em 3 dias — R$ XX,XX` / **D-1:** `Vencimento amanhã — Viggo R$ XX,XX`
- **Props:** `{ companyName, amount, dueDate, daysRemaining: 3|1 }`

### 8.12 `subscription-cancelled` ✅ Fase 2
- **Subject:** `Assinatura cancelada — {{companyName}}`
- **Props:** `{ companyName }`

### ⏳ Pendentes
- `invite-created`, `totem-activated`, `weekly-digest`, `whatsapp-*` — não implementados

---

## 9. Pontos de Integração no Código — Atualizado

### 9.1 `CompanyController.signup` — `backend/src/controller/company/CompanyController.ts:165` ✅
```ts
void emailService.sendWelcomeCompany({ to: email, adminName: nameUser, companyName: company.name, trialExpiresAt })
```

### 9.2 `CompanyController.acceptInvite` — `backend/src/controller/company/CompanyController.ts:664` ✅ Fase 2
```ts
void emailService.sendEmployeeWelcome({ to: user.email, employeeName: user.name, companyName: inviteToken.company.name })
```

### 9.3 `PaymentController.handleWebhook` — `backend/src/controller/payment/PaymentController.ts:261,304,336` ✅
- `PAYMENT_CONFIRMED/RECEIVED` → `sendPaymentConfirmed`
- `PAYMENT_OVERDUE` → `sendPaymentOverdue`
- `SUBSCRIPTION_DELETED/INACTIVATED` → `sendSubscriptionCancelled` ✅ Fase 2
- `cancelSubscription:202` → `sendSubscriptionCancelled` ✅ Fase 2

### 9.4 `JustificativaController` — `backend/src/controller/JustificativaController.ts:53,145` ✅
- `create` → `sendJustificativaCreated` (para admins)
- `approve` → `sendJustificativaDecided` (para dono)

### 9.5 Biometria — `backend/src/utils/biometricRevalidation.ts:35` + `jobs/biometricExpiringJob.ts` ✅
- `purgeExpiredBiometricDescriptors` → `sendBiometricPurged` após `$transaction` ✅ Fase 2
- `biometricExpiringJob` → `sendBiometricExpiring` (20-35d do vencimento)

### 9.6 Trial + PaymentUpcoming — `jobs/trialEndingJob.ts` + `jobs/paymentUpcomingJob.ts` ✅
- Trial D-3/D-1 via `Company where status=TRIAL`
- Pagamento D-3/D-1 via `Payment where status=PENDING` ✅ Fase 2

### 9.7 Forgot Password — `controller/ForgotPasswordController.ts` + `routes/authRoutes.ts:9` ✅ Fase 2
- `POST /auth/forgot-password` (gera `123456`, hash SHA-256, expira 10min, `sendResetPassword`)
- `POST /auth/verify-reset-code` (5 tentativas, JWT 5min `type: password-reset`)
- `POST /auth/reset-password` (bcrypt 10, limpa `resetCode*`)

---

## 10. Crons e Jobs Agendados — Atualizado

Em `backend/src/server.ts` (já usa `node-cron`):

```ts
cron.schedule("0 2 * * *",  runRetentionCleanup)      // 02:00 existente
cron.schedule("0 3 1 * *",  runAfdBackup)             // 03:00 dia 01 existente
cron.schedule("0 8 * * *",  runPaymentUpcomingJob)    // 08:00 ✅ Fase 2 — pagamento D-3/D-1
cron.schedule("0 9 * * *",  runTrialEndingJob)        // 09:00 ✅ Fase 1 — trial D-3/D-1
cron.schedule("30 9 * * *", runBiometricExpiringJob)  // 09:30 ✅ Fase 1 — biometria 30d antes
```

Todos com `try/catch` + `console.log` para não derrubar scheduler.

---

## 11. Fluxo de Envio e Resiliência

```
Controller/Cron → emailService.send(template, props)
                      │
                      ├─ isEnabled? (EMAIL_ENABLED) → skip se false (TEST desabilita)
                      ├─ resolveTo(to) → se EMAIL_TEST_TO setado, substitui e loga original
                      ├─ render(template, props) → { subject, html, text }
                      ├─ if EMAIL_PREVIEW → loga html e return "preview"
                      └─ provider.send({ from: EMAIL_FROM, to: resolvedTo, subject, html, text, replyTo })
                             │
                             └─ Resend API → { id } ou throw (logado)
```

- **Retry:** Resend tem retry interno; Fase 1/2 sem `BullMQ` (futuro).
- **Rate limit:** 2 req/s no free; `paymentUpcomingJob` e `trialEndingJob` sequenciais.
- **EmailLog (⏳ não criado):**
```prisma
model EmailLog {
  id        String   @id @default(uuid())
  to        String
  template  String
  subject   String
  status    String   // SENT | FAILED | SKIPPED
  error     String?
  createdAt DateTime @default(now())
  @@index([template, createdAt])
}
```

---

## 12. LGPD, Deliverability e Boas Práticas

- **Transacional vs Marketing:** todos os 13 templates são transacionais (execução de contrato / legítimo interesse) — sem opt-in, com footer DPO `dpo@viggo.com.br`.
- **Domínio:** ainda não verificado — usar `onboarding@resend.dev` + `EMAIL_TEST_TO=matheusdemoraes2@gmail.com`; após verificar `viggo.com.br` trocar para `noreply@viggo.com.br` + `dragonbolad@gmail.com`.
- **Dados pessoais:** sem CPF/face/CNPJ no corpo.

---

## 13. Plano de Implementação Passo a Passo — Atualizado

### Etapa 0 — Preparação ✅
- [x] `cd backend && npm install resend` (5 pacotes, `package.json` atualizado)
- [x] `prisma/schema.prisma` + `npx prisma generate` + `npx prisma db push`
- [x] `RESEND_API_KEY="re_CryA9J2X_..."` em `backend/.env` (rotação recomendada após commit)

### Etapa 1 — Fundação ✅
- [x] `environment.ts` com `EMAIL_*` (corrigido `preprocess` para `"false"` → `false`)
- [x] `.env-example` atualizado
- [x] `services/email/emailProvider.ts`, `resendProvider.ts` (com `payload` condicional + `unknown` cast), `emailService.ts` (13 métodos)

### Etapa 2 — Templates ✅
- [x] 8 templates Fase 1 + 5 templates Fase 2 (13 total) com `layout.ts`
- [x] `routes/devRoutes.ts` com 13 previews (`GET /dev/email/preview/:template` + `?format=json`) — DEV only
- [x] Validação: `npx tsx src/scripts/testEmail.ts` e `testFase2.ts` com IDs Resend

### Etapa 3 — Integração Transacional ✅
- [x] `CompanyController.signup:165` + `acceptInvite:664`
- [x] `JustificativaController.create:53` + `approve:145`
- [x] `PaymentController.handleWebhook:261/304/336` + `cancelSubscription:202`
- [x] `ForgotPasswordController:1` + `authRoutes:9` (3 rotas com `authLimiter`)

### Etapa 4 — Crons ✅
- [x] `jobs/trialEndingJob.ts`, `jobs/biometricExpiringJob.ts`, `jobs/paymentUpcomingJob.ts`
- [x] `server.ts:39-66` com 3 crons de e-mail (08:00, 09:00, 09:30)

### Etapa 5 — QA e Homolog ✅
- [x] `EMAIL_TEST_TO=matheusdemoraes2@gmail.com` + `EMAIL_PREVIEW=false` — envio real validado (ex: `70170ff5...`, `436d0375...`)
- [ ] `EMAIL_TEST_TO=dragonbolad@gmail.com` — pendente de verificação de domínio
- [x] Preview em `curl http://localhost:3333/dev/email/preview` — 13 links OK

### Etapa 6 — Produção ⏳ Parcial
- [ ] Verificar domínio `viggo.com.br` em Resend (SPF/DKIM/DMARC)
- [ ] Trocar `EMAIL_FROM` para `noreply@viggo.com.br` e `EMAIL_TEST_TO` para `dragonbolad@gmail.com` (ou remover)
- [ ] Rotacionar `RESEND_API_KEY` (exposta em `.env`)
- [ ] Deploy + monitorar Resend dashboard + `pino`
- [ ] Implementar frontend `ForgotPasswordPage.tsx` (`PLAN_FORGOT_PASSWORD.md:208`)

---

## 14. Testes e Validação

| Tipo | Onde | Status | O que testar |
|------|------|--------|--------------|
| Unit | `backend/src/templates/*.test.ts` | ⏳ Não criado | Snapshot HTML, subject, `text` não vazio |
| Unit | `backend/src/services/email/emailService.test.ts` | ⏳ Não criado | `resolveTo`, `isEnabled`, `EMAIL_PREVIEW` |
| Integration | `backend/src/test/integration/email.test.ts` | ⏳ Não criado | Mock `Resend`, `POST /companies/signup` dispara `sendWelcomeCompany` |
| Build | `npm run build` | ✅ OK | `tsc` sem erros |
| Unit suite | `npm test` | ✅ 37 arquivos / 569 testes | Sem regressão |
| Manual | `GET /dev/email/preview/welcome-company` | ✅ OK | HTML renderizado |
| E2E | `npx tsx --env-file .env src/scripts/testFase2.ts` | ✅ OK | 6 envios Fase 2 com IDs |
| Homolog | `dragonbolad@gmail.com` | ⏳ Bloqueado | Até verificar domínio, só `matheusdemoraes2@gmail.com` |

---

## 15. Riscos e Mitigações

| Risco | Status | Mitigação |
|-------|--------|-----------|
| Domínio não verificado → só entrega para dono | 🔴 Ativo | Usar `matheusdemoraes2@gmail.com` até verificar `viggo.com.br`; Resend free 100/dia |
| Enviar para usuário real em teste | 🟢 Mitigado | `EMAIL_TEST_TO` força override |
| Cron reenviando D-3/D-1 | 🟢 Mitigado | `isSameDay` + `startOfDay`; log `companyId`/`paymentId` |
| Resend fora do ar | 🟢 Mitigado | Fire-and-forget + log; sem retry automático |
| `RESEND_API_KEY` exposta em `.env` | 🔴 Rotacionar | Gerar nova chave em Resend |
| E-mail cair em spam | ⏳ Verificar | SPF/DKIM/DMARC após domínio |

---

## 16. Checklist Final — Atualizado

- [x] `resend` instalado
- [x] `environment.ts` + `.env-example` atualizados (com `preprocess`)
- [x] `emailProvider` + `resendProvider` + `emailService` criados (13 métodos)
- [x] `layout.ts` criado
- [x] 8 templates Fase 1 implementados (html + text)
- [x] 5 templates Fase 2 implementados (`resetPassword`, `employeeWelcome`, `biometricPurged`, `paymentUpcoming`, `subscriptionCancelled`)
- [x] `CompanyController.signup` + `acceptInvite` integrados
- [x] `PaymentController.handleWebhook` integrado (4 eventos) + `cancelSubscription`
- [x] `JustificativaController` integrado (2 pontos)
- [x] `ForgotPasswordController` + `authRoutes` (3 rotas)
- [x] `prisma User resetCode*` + `db push`
- [x] `trialEndingJob` + `biometricExpiringJob` + `paymentUpcomingJob` criados
- [x] Crons registrados em `server.ts` (08:00, 09:00, 09:30)
- [x] Rota `dev/email/preview` criada (15 templates, DEV only)
- [x] `npm run build` + `npm test` (569) OK
- [x] Homolog validado com `matheusdemoraes2@gmail.com` (bloqueado para `dragonbolad@gmail.com` até domínio)
- [ ] Domínio verificado no Resend (produção)
- [ ] `RESEND_API_KEY` rotacionada
- [ ] `EMAIL_TEST_TO` = `dragonbolad@gmail.com` ou removido em produção
- [ ] Frontend `ForgotPasswordPage.tsx` implementado
- [ ] Testes unit/integration de e-mail criados
- [ ] `invite-created`, `totem-activated`, `weekly-digest`, `whatsapp-*`, `EmailLog` — pendentes (não priorizados)
- [ ] Documentação `AGENTS.md` se necessário

---

## 17. Apêndice — Exemplo de Código

### `emailProvider.ts` — atual

```ts
export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string | undefined;
  replyTo?: string | undefined;
}
```

### `resendProvider.ts` — atual (payload condicional)

```ts
const payload: Record<string, unknown> = { from: opts.from, to: [...], subject: opts.subject, html: opts.html };
if (opts.text) payload.text = opts.text;
if (opts.replyTo) payload.replyTo = opts.replyTo;
const { data, error } = await this.resend.emails.send(payload as unknown as Parameters<Resend["emails"]["send"]>[0]);
```

### `emailService.ts` — `resolveTo` + `preprocess`

```ts
function resolveTo(originalTo: string | string[]): string[] {
  const toArray = Array.isArray(originalTo) ? originalTo : [originalTo];
  if (Env.EMAIL_TEST_TO) {
    console.log(`[Email] Redirect: ${toArray.join(", ")} → ${Env.EMAIL_TEST_TO}`);
    return [Env.EMAIL_TEST_TO];
  }
  return toArray;
}
// environment.ts: z.preprocess((v) => v === undefined ? true : String(v) === "true", z.boolean())
```

---

> **Próximos passos:** 1) Verificar domínio `viggo.com.br` em Resend e rotacionar `RESEND_API_KEY`; 2) Implementar frontend `ForgotPasswordPage.tsx` (`PLAN_FORGOT_PASSWORD.md`); 3) Criar testes de e-mail; 4) Implementar `invite-created`/`totem-activated`/`weekly-digest` se priorizado.

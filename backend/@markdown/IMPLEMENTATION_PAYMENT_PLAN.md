# Viggo SaaS - Plano de Implementação: Pagamentos + Multi-tenancy

> **Versão:** 1.0  
> **Data:** 2026-06-21  
> **Stack:** Node.js/TypeScript/Express/Prisma/PostgreSQL + React  
> **Gateway:** Asaas (Brasil) → Stripe (Internacional futuro)

---

## 🎯 Objetivo

Implementar sistema de cobrança recorrente (B2B, por empresa) com:
- Trials de 30 dias
- 4 datas de vencimento (1, 10, 20, 28)
- Planos por tier de funcionários
- Checkout transparente (React)
- Controle de acesso baseado em assinatura
- Multi-tenancy estrito (Company isolation)

---

## 🏗️ Arquitetura Geral

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   Asaas API        │
│   (React)       │     │   (Express)      │     │   (Pagamentos)     │
└─────────────────┘     └────────┬─────────┘     └────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌────────────┐ ┌──────────┐ ┌────────────┐
            │ PostgreSQL │ │  Redis   │ │  Resend    │
            │ (Prisma)   │ │ (Queue)  │ │ (Email)    │
            └────────────┘ └──────────┘ └────────────┘
```

---

## 📊 Schema Prisma Completo

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  MASTER
  ENTERPRISE
  EMPLOYEE
}

enum CheckInType {
  ENTRY
  LUNCH_START
  LUNCH_END
  EXIT
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

model Company {
  id            String    @id @default(uuid())
  name          String
  cnpj          String?   @unique
  email         String?   @unique
  phone         String?
  address       Json?
  settings      Json      @default("{}")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  users         User[]
  checkIns      CheckIn[]
  subscription  CompanySubscription?
  planId        String?
  plan          Plan?     @relation(fields: [planId], references: [id])
  auditLogs     AuditLog[]
}

model User {
  id             String    @id @default(uuid())
  name           String
  email          String    @unique
  password       String
  role           Role      @default(EMPLOYEE)
  faceDescriptor Json?
  avatarUrl      String?
  isActive       Boolean   @default(true)
  lastLoginAt    DateTime?
  companyId      String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  // Relations
  company        Company   @relation(fields: [companyId], references: [id])
  checkIns       CheckIn[]
  auditLogs      AuditLog[]
  
  @@index([companyId, role])
  @@index([email])
}

model Plan {
  id          String   @id @default(uuid())
  name        String   @unique        // STARTER, GROWTH, SCALE, ENTERPRISE
  displayName String                   // "Starter", "Growth", ...
  tierMin     Int      @default(1)
  tierMax     Int?                     // null = ilimitado
  priceCents  Int                      // 4990, 19990, 49990, 0
  interval    String   @default("month")
  features    Json     @default("[]")
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  subscriptions CompanySubscription[]
}

model CompanySubscription {
  id                     String   @id @default(uuid())
  companyId              String   @unique
  company                Company  @relation(fields: [companyId], references: [id])
  planId                 String
  plan                   Plan     @relation(fields: [planId], references: [id])
  asaasCustomerId        String   @unique
  asaasSubscriptionId    String?  @unique
  status                 SubscriptionStatus @default(TRIALING)
  currentPeriodStart     DateTime
  currentPeriodEnd       DateTime
  trialEndsAt            DateTime?
  cancelledAt            DateTime?
  paymentDay             Int      // 1, 10, 20, 28
  gracePeriodEndsAt      DateTime?
  metadata               Json     @default("{}")
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  
  @@index([asaasCustomerId])
  @@index([asaasSubscriptionId])
  @@index([status])
  @@index([paymentDay])
}

model CheckIn {
  id        String      @id @default(uuid())
  createdAt DateTime    @default(now())
  type      CheckInType
  latitude  Float
  longitude Float
  address   String?
  userId    String
  companyId String
  company   Company     @relation(fields: [companyId], references: [id])
  user      User        @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
  @@index([companyId, createdAt])
  @@index([createdAt])
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  companyId String
  action    String
  entity    String
  entityId  String?
  oldData   Json?
  newData   Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([companyId, createdAt])
  @@index([entity, entityId])
}
```

---

## 💰 Planos de Preço (Seed)

| Plano | Funcionários | Preço/Mês | Features |
|-------|-------------|-----------|----------|
| **Starter** | 1-10 | R$ 49,90 | Facial, Relatórios básicos, API |
| **Growth** | 11-50 | R$ 199,90 | + Relatórios avançados, Webhooks, Suporte prioritário |
| **Scale** | 51-150 | R$ 499,90 | + Relatórios completos, SSO, Auditoria avançada |
| **Enterprise** | 151+ | Sob consulta | Custom, SLA, On-premise, Gerente dedicado |

---

## 🔄 Fluxos Principais

### 1. Onboarding Empresa (Admin cria conta)
```
POST /auth/register (role: ENTERPRISE)
  → Cria Company + User(ENTERPRISE)
  → Redireciona /billing/checkout
    → Escolhe plano + dia vencimento (1,10,20,28)
    → Cria Customer Asaas
    → Cria Subscription Asaas (trial_days=30, billing_cycle_anchor=dia_escolhido)
    → Salva CompanySubscription local (TRIALING)
    → Retorna checkout URL Asaas OU dados para checkout transparente
```

### 2. Checkout Transparente (Frontend React)
```
GET /billing/plans → Lista planos
POST /billing/checkout → Inicia trial (dados empresa + plano + dia)
  → Retorna { subscriptionId, asaasSubscriptionId, trialEndsAt }
GET /billing/payment/:subscriptionId → Métodos disponíveis
POST /billing/payment → Processa (PIX QR / Boleto PDF / Cartão token)
  → Webhook Asaas INVOICE_RECEIVED → Status ACTIVE
```

### 3. Ciclo de Vida da Assinatura (Webhooks Asaas)

| Evento Asaas | Status Local | Ação |
|--------------|--------------|------|
| `INVOICE_RECEIVED` | `ACTIVE` | Libera acesso, reseta grace period |
| `INVOICE_UPCOMING` (7/3/1d) | `ACTIVE` | Envia email/WhatsApp lembrete |
| `INVOICE_OVERDUE` | `PAST_DUE` | Inicia grace period (3 dias), alerta |
| `INVOICE_PAYMENT_FAILED` | `PAST_DUE` | Mantém grace, alerta + link pagamento |
| `SUBSCRIPTION_CANCELLED` | `CANCELLED` | Acesso até currentPeriodEnd |
| `SUBSCRIPTION_EXPIRED` | `EXPIRED` | Bloqueia acesso total |
| `SUBSCRIPTION_CHANGED` | `ACTIVE` | Atualiza planId, price, features |

### 4. Controle de Acesso (Middleware)

```typescript
// Aplicado em: /checkins/*, /employees/*, /reports/*
// LIVRE: /sessions/*, /billing/*, /auth/*

subscriptionMiddleware:
  TRIALING + trialEndsAt > now  → 200 OK + header X-Trial-Ends-At
  ACTIVE                         → 200 OK
  PAST_DUE + gracePeriodEndsAt > now → 200 OK + header X-Grace-Ends-At
  Otherwise                      → 403 { error: 'SUBSCRIPTION_REQUIRED' }
```

### 5. Validação de Tier (Limite Funcionários)

```typescript
POST /employees (auth: ENTERPRISE)
  → TierValidationService.check(companyId)
    → Conta EMPLOYEE ativos da company
    → Compara com plan.tierMax
    → Se excedeu: 403 { error: 'TIER_LIMIT_EXCEEDED', limit, current }
    → Se ok: Cria User(role=EMPLOYEE, companyId)
```

---

## 🛣️ Endpoints API (Billing Module)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/billing/plans` | Public | Lista planos ativos |
| POST | `/billing/checkout` | ENTERPRISE | Inicia trial (cria customer+sub Asaas) |
| GET | `/billing/payment/:subId` | ENTERPRISE | Opções pagamento (PIX/Boleto/Cartão) |
| POST | `/billing/payment` | ENTERPRISE | Processa pagamento (token Asaas) |
| GET | `/billing/subscription` | ENTERPRISE | Status atual + próxima fatura |
| POST | `/billing/portal` | ENTERPRISE | URL portal cliente Asaas (white-label) |
| POST | `/billing/change-plan` | ENTERPRISE | Upgrade/downgrade (prorata) |
| POST | `/billing/cancel` | ENTERPRISE | Cancela no fim do período |
| POST | `/billing/reactivate` | ENTERPRISE | Reativa se CANCELLED |
| POST | `/webhooks/asaas` | **Público** (HMAC) | Recebe eventos Asaas |

---

## 📁 Estrutura de Pastas (Backend)

```
backend/src/
├── modules/
│   ├── billing/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Plan.ts
│   │   │   │   ├── CompanySubscription.ts
│   │   │   │   └── SubscriptionStatus.ts
│   │   │   ├── repositories/
│   │   │   │   ├── PlanRepository.ts
│   │   │   │   └── CompanySubscriptionRepository.ts
│   │   │   └── services/
│   │   │       ├── AsaasService.ts
│   │   │       ├── SubscriptionService.ts
│   │   │       ├── WebhookHandler.ts
│   │   │       └── TierValidationService.ts
│   │   ├── presentation/
│   │   │   ├── routes/
│   │   │   │   ├── billingRoutes.ts
│   │   │   │   └── webhookRoutes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── BillingController.ts
│   │   │   │   └── WebhookController.ts
│   │   │   └── schemas/
│   │   │       └── billingSchemas.ts
│   │   ├── infrastructure/
│   │   │   └── AsaasHttpClient.ts
│   │   ├── billing.module.ts
│   │   └── index.ts
│   ├── auth/          # Existente (ajustar roles)
│   ├── employees/     # Existente (add tier validation)
│   └── checkins/      # Existente (add subscription middleware)
├── middleware/
│   ├── AuthMiddleware.ts       # Atualizar para novos roles
│   ├── SubscriptionMiddleware.ts  # NOVO
│   └── ...
├── database/
│   ├── prisma.ts
│   └── prisma-extensions.ts   # Multi-tenancy (já existe)
└── app.ts
```

---

## 🌐 Frontend (React) - Páginas

| Página | Rota | Componentes Chave |
|--------|------|-------------------|
| **Plans** | `/billing/plans` | PlanCard, FeatureList, CTAButton |
| **Checkout** | `/billing/checkout` | CompanyForm, PlanSelector, PaymentDaySelector, AsaasCheckout |
| **Payment** | `/billing/payment/:id` | PixQrCode, BoletoViewer, CardForm (Asaas.js) |
| **My Subscription** | `/billing/subscription` | StatusBadge, NextInvoiceCard, ActionButtons (Portal, ChangePlan, Cancel) |
| **Portal** | (redirect Asaas) | White-label Asaas |

### Integração Asaas.js (Cartão)
```tsx
// components/CardPaymentForm.tsx
import Asaas from '@asaas/asaas-js';

const asaas = Asaas(import.meta.env.VITE_ASAAS_PUBLIC_KEY);

const handleSubmit = async (cardData) => {
  const token = await asaas.createCardToken(cardData);
  await api.post('/billing/payment', {
    subscriptionId,
    paymentMethod: 'CREDIT_CARD',
    creditCardToken: token.id,
  });
};
```

---

## 📧 Comunicação (Email + WhatsApp) - **FUTURO**

> **DECISÃO:** Não implementar na Fase 1 (MVP). Foco apenas no core de pagamentos.

### Fase 2+: Email (Resend)
- [ ] Setup Resend + domínio próprio + DKIM/SPF/DMARC
- [ ] Templates React Email: `trial-welcome`, `trial-activation`, `trial-ending-3d`, `trial-ending-1d`
- [ ] Templates: `invoice-upcoming-7d/3d/1d`, `payment-confirmed`, `payment-failed`, `subscription-cancelled`
- [ ] Template: `tier-limit-warning` (80% do limite)

### Fase 2+: WhatsApp (Zenvia - Oficial Meta)
- [ ] Contrato Zenvia/Take Blip
- [ ] Templates aprovados Meta: `payment_failed`, `trial_ending`
- [ ] Integração webhook status entrega/leitura

---

## 🧪 Testes Obrigatórios

| Cenário | Tipo | Cobertura |
|---------|------|-----------|
| Cria subscription trial + customer Asaas | Unit | 100% |
| Webhook INVOICE_RECEIVED → ACTIVE | Integration | 100% |
| Webhook OVERDUE → grace + alerta | Integration | 100% |
| Trial expira sem pagamento → EXPIRED | Integration | 100% |
| Upgrade mid-cycle (prorata) | Unit | 100% |
| Downgrade (próximo ciclo) | Unit | 100% |
| Tier limit block | Unit | 100% |
| Middleware bloqueia EXPIRED | Integration | 100% |
| Multi-tenancy isolation | E2E | 100% |
| Checkout PIX → QR code | E2E | 100% |
| Roles: MASTER vê tudo, ENTERPRISE só sua company | E2E | 100% |

---

## 📅 Cronograma (8 Semanas)

| Semana | Backend | Frontend | Infra/Outros |
|--------|---------|----------|--------------|
| **1** | Schema + Migration + Seed Plans | - | CNPJ + Conta PJ + Asaas Sandbox |
| **2** | AsaasService (Customer, Sub, Payment) | Plans page | ngrok/webhook URL |
| **3** | SubscriptionService (startTrial, getStatus) | Checkout form | - |
| **4** | WebhookHandler (todos eventos) + Middleware | Payment page (PIX/Boleto/Cartão) | Testes webhook sandbox |
| **5** | TierValidation + ChangePlan + Cancel | My Subscription page | - |
| **6** | Portal URL + Cron jobs (trial emails) | - | Monitoramento (Sentry, UptimeRobot) |
| **7** | Testes automatizados (unit + int) | E2E Playwright | Load test webhook (k6) |
| **8** | Deploy prod + DNS + SSL | Deploy Vercel | Go-live checklist + Runbook |

---

## ✅ Checklist Go-Live

- [ ] CNPJ ativo + Certificado digital A1
- [ ] Conta PJ aberta + validada no Asaas
- [ ] Asaas Produção (API Key + Webhook Secret produção)
- [ ] Variáveis `.env` produção
- [ ] Migração Prisma rodou em prod + seed plans
- [ ] Testes E2E passando (sandbox → produção)
- [ ] Monitoramento: Sentry (erros), UptimeRobot (webhook), Pino logs
- [ ] Runbook: Webhook falhando, subscription presa, chargeback
- [ ] Documentação interna: Fluxos, troubleshooting, contatos Asaas
- [ ] Backup/Restore testado

---

## ⚠️ Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Webhook Asaas falha/atraso | Média | Alto | Idempotência (chave única event_id), retry exponencial, DLQ |
| Chargeback/Disputa | Baixa | Médio | Webhook `CHARGEBACK_RECEIVED` → bloquear + alerta manual |
| Tier limit race condition | Baixa | Alto | Transação Prisma + lock otimista (`version` field) |
| PIX não confirmado instantâneo | Média | Baixo | Webhook `INVOICE_RECEIVED` = source of truth |
| LGPD/PCI DSS | - | Crítico | Asaas PCI DSS Level 1, não armazena cartão no backend |

---

## 🔐 Permissões por Role

| Ação | MASTER | ENTERPRISE | EMPLOYEE |
|------|--------|------------|----------|
| Ver todas companies | ✅ | ❌ | ❌ |
| Gerenciar plans/preços | ✅ | ❌ | ❌ |
| Criar empresa (onboarding) | ✅ | ❌ | ❌ |
| Gerenciar usuários da company | ✅ | ✅ (própria) | ❌ |
| Ver relatórios company | ✅ | ✅ (própria) | ❌ |
| Bater ponto (check-in) | ✅ | ❌ | ✅ |
| Ver próprio ponto | ✅ | ✅ (própria) | ✅ |
| Acessar /billing/* | ✅ | ✅ (própria) | ❌ |
| Acessar /admin/* | ✅ | ❌ | ❌ |

---

## 🔧 Variáveis de Ambiente

```env
# backend/.env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="super-secret-key"
JWT_EXPIRES_IN="7d"

# Asaas
ASAAS_API_KEY="asaas_xxx"
ASAAS_WEBHOOK_SECRET="whsec_xxx"
ASAAS_BASE_URL="https://api.asaas.com/v3"  # sandbox: https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_URL="https://api.seudominio.com/api/webhooks/asaas"
ASAAS_PUBLIC_KEY="act_xxx"  # Para frontend (Asaas.js)

# App
TRIAL_DAYS=30
GRACE_PERIOD_DAYS=3
FRONTEND_URL="https://app.seudominio.com"
BACKEND_URL="https://api.seudominio.com"

# Email (Resend) - FUTURO
# RESEND_API_KEY="re_xxx"
# EMAIL_FROM="Viggo <billing@seudominio.com>"

# WhatsApp (Zenvia) - FUTURO
# ZENVIA_API_TOKEN="xxx"
# ZENVIA_SENDER="5511999999999"

# Frontend
VITE_API_URL="https://api.seudominio.com"
VITE_ASAAS_PUBLIC_KEY="act_xxx"
```

---

## 📝 Próximos Passos Imediatos

1. **Semana 1 - Fundação**
   - [ ] Abrir CNPJ MEI/LTDA + Conta PJ
   - [ ] Criar conta Asaas Sandbox → pegar credenciais
   - [ ] Ajustar schema Prisma (Roles + Billing models)
   - [ ] Rodar migração + seed plans
   - [ ] Criar estrutura `src/modules/billing/`

2. **Definições Pendentes**
   - [ ] Domínio de staging para webhook (ngrok ou subdomínio real)
   - [ ] Deploy targets: Backend (Railway/Render/Fly.io), Frontend (Vercel)

---

## 📌 Decisões Registradas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Gateway | Asaas | Brasil nativo, PIX/Boleto, split, API limpa |
| Checkout | Transparente | UX superior, controle total, brand próprio |
| Trial | 30 dias nativo Asaas | Padrão mercado, zero código extra |
| Vencimento | 4 dias fixos (1,10,20,28) | `billing_cycle_anchor` nativo |
| Email | **FUTURO** (Resend) | Entregabilidade, React Email, custo previsível |
| WhatsApp | **FUTURO** (Zenvia) | Oficial Meta, templates, SLA |
| Roles | MASTER/ENTERPRISE/EMPLOYEE | Hierarquia clara, multi-tenancy estrito |

---

*Documento vivo - atualizar conforme decisões de implementação*
# Plano SaaS Multi-Tenancy - Backend Viggo

## Visão Geral
Transformar o backend atual (single-tenant) em SaaS multi-tenant com planos por tiers, trial de 30 dias e arquitetura preparada para Asaas.

---

## FASE 1: Schema & Migração (Semana 1-2) ✅ CONCLUÍDA

### 1.1 Novos Enums
```prisma
enum PlanTier { TIER_I, TIER_II, TIER_III, ENTERPRISE_CUSTOM }
enum CompanyStatus { TRIAL, ACTIVE, SUSPENDED, CANCELLED }
enum UserRole { MASTER, ENTERPRISE_ADMIN, EMPLOYEE }
```

### 1.2 Modelos Atualizados

#### Company (campos novos)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cnpj` | String? @unique | Validação única de empresa |
| `plan` | PlanTier @default(TIER_I) | Plano atual |
| `status` | CompanyStatus @default(TRIAL) | Status da assinatura |
| `planExpiresAt` | DateTime? | Fim do trial ou renovação |
| `maxEmployees` | Int @default(10) | Limite do plano atual |
| `asaasCustomerId` | String? | Integração Asaas (futuro) |
| `settings` | Json? | Personalizações (logo, cores, fuso) |
| `trialUsed` | Boolean @default(false) | Evita trial duplicado |
| `updatedAt` | DateTime @updatedAt | Timestamp de atualização |

#### User (campos novos)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `role` | UserRole @default(EMPLOYEE) | MASTER, ENTERPRISE_ADMIN, EMPLOYEE |
| `cpf` | String? @unique | Validação única no signup |
| `enterpriseId` | String? | Para MASTER acessar empresas |
| `lastLoginAt` | DateTime? | Auditoria |
| `updatedAt` | DateTime @updatedAt | Timestamp de atualização |

#### Novos Modelos

**Subscription** - Histórico de planos/pagamentos
```prisma
model Subscription {
  id                    String    @id @default(uuid())
  companyId             String
  company               Company   @relation(fields: [companyId], references: [id])
  planTier              PlanTier
  price                 Decimal   @db.Decimal(10, 2)
  status                String    // ACTIVE, PAST_DUE, CANCELLED, TRIAL
  asaasSubscriptionId   String?
  startedAt             DateTime  @default(now())
  expiresAt             DateTime?
  cancelledAt           DateTime?
  createdAt             DateTime  @default(now())

  @@index([companyId])
  @@index([status])
}
```

**InviteToken** - Convite de funcionários
```prisma
model InviteToken {
  id        String    @id @default(uuid())
  email     String
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  role      UserRole  @default(EMPLOYEE)
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([companyId])
  @@index([email])
}
```

### 1.3 Migração de Dados ✅ EXECUTADA
- Script: `ADMIN` → `ENTERPRISE_ADMIN` (empresas existentes)
- Seu usuário → `MASTER` (via MASTER_EMAIL env)
- Empresas existentes → `TRIAL` com 30 dias, `TIER_I`
- Subscriptions TRIAL criadas automaticamente

---

## FASE 2: Auth & Company Module (Semana 2-3) ✅ CONCLUÍDA

### 2.1 JWT Payload Atualizado ✅
```typescript
{
  id: string,
  role: UserRole,
  companyId: string,
  planTier: PlanTier,
  isMaster: boolean
}
```

### 2.2 PlanMiddleware ✅ IMPLEMENTADO
- `getCompanyPlanInfo()`: busca plano, status, limites, trial
- `requireActivePlan()`: bloqueia se SUSPENDED/CANCELLED/TRIAL_EXPIRED
- `requireEmployeeLimit()`: bloqueia criação se limite atingido
- `planMiddleware()`: injeta `planInfo` no request
- `createDynamicRateLimiter()`: prepara rate limits por tier

### 2.3 RoleGuard ✅ IMPLEMENTADO
- `requireRole(...roles)`: factory para guards customizados
- `requireMaster`, `requireEnterpriseAdmin`, `requireAdminOrMaster`, `requireEmployeeOrAbove`
- Helpers: `isMaster()`, `isEnterpriseAdmin()`, `isEmployee()`, `canManageCompany()`, `canAccessMasterRoutes()`

### 2.4 CompanyController ✅ IMPLEMENTADO
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/companies/signup` | Self-service signup (CPF/CNPJ único, cria company + admin) |
| GET | `/companies/me` | Dados empresa + plano + limites + usage |
| PUT | `/companies/me` | Atualizar configurações (logo, nome, settings) |
| GET | `/companies/me/usage` | Funcionários, check-ins, rate limits atuais |
| POST | `/companies/me/invites` | Convidar funcionário (email + role, token 7 dias) |
| GET | `/companies/me/invites` | Listar convites pendentes |
| DELETE | `/companies/me/invites/:id` | Cancelar convite |
| GET | `/companies/invites/:token` | Public: validar convite por token |
| POST | `/companies/invites/accept` | Public: aceitar convite + criar user |

### 2.5 Company Routes ✅ REGISTRADAS
- Públicas: `/signup`, `/invites/:token`, `/invites/accept`
- Protegidas (auth + planMiddleware): `/me`, `/me/usage`, `/me/invites*`
- Guards: `requireEnterpriseAdmin` para admin actions, `requireEmployeeLimit` para create invite

---

## FASE 3: Plan Enforcement & Rate Limiting (Semana 3) ✅ BASE IMPLEMENTADA

### 3.1 Limites por Tier ✅ CONFIGURADOS
```typescript
const PLAN_LIMITS = {
  TIER_I: { maxEmployees: 10, price: 49.90, api: { general: 100, checkin: 10, faceValidation: 30 } },
  TIER_II: { maxEmployees: 50, price: 149.90, api: { general: 300, checkin: 20, faceValidation: 60 } },
  TIER_III: { maxEmployees: 150, price: 349.90, api: { general: 600, checkin: 50, faceValidation: 100 } },
  ENTERPRISE_CUSTOM: { maxEmployees: null, price: null, api: { general: 1000, checkin: 100, faceValidation: 200 } }
}
```

### 3.2 Rate Limiting Dinâmico ✅ PREPARADO
- `createDynamicRateLimiter(plan)` retorna limites por tier
- Middleware `planMiddleware` injeta `planInfo` no request
- Próximo: substituir limiters fixos por dinâmicos nas rotas

---

## FASE 4: Master Dashboard (Semana 3-4) ✅ CONCLUÍDA

### 4.1 MasterController ✅ IMPLEMENTADO
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/master/companies` | Lista paginada + filtros (status, plano, search) + usage |
| GET | `/master/companies/:id` | Detalhes completos (users, subscriptions, settings) |
| GET | `/master/metrics` | KPIs globais (MRR, churn, growth, plan distribution) |
| PUT | `/master/companies/:id/plan` | Override plano + cria subscription |
| PUT | `/master/companies/:id/status` | ACTIVE/SUSPENDED/CANCELLED |
| POST | `/master/companies/:id/extend-trial` | Estender trial em N dias (1-90) |

### 4.2 Master Routes ✅ REGISTRADAS
- Todas protegidas: `authMiddleware` + `requireMaster`

---

## FASE 5: Asaas Integration (Fase 2 - Após PJ/MEI) ⏳ PREPARADO

### 5.1 Preparação no Schema ✅
- `asaasCustomerId` em Company
- `asaasSubscriptionId` em Subscription
- Subscription model para histórico completo
- Webhook endpoint planejado: `POST /webhooks/asaas`

### 5.2 Implementação Futura
- Configurar Asaas sandbox → production
- Checkout, Webhook handlers (PAYMENT_RECEIVED, PAYMENT_OVERDUE, SUBSCRIPTION_CANCELLED), Retry logic
- Automatizar: Suspender em atraso, Reativar no pagamento

---

## Estrutura de Arquivos Implementados ✅

```
backend/src/
├── modules/
│   ├── company/
│   │   └── CompanyController.ts      ✅
│   ├── master/
│   │   └── MasterController.ts       ✅
│   └── subscription/                 ⏳ (placeholder para Asaas)
├── middleware/
│   ├── PlanMiddleware.ts             ✅
│   └── RoleGuard.ts                  ✅
├── utils/
│   ├── planLimits.ts                 ✅
│   └── cpfCnpjValidator.ts           ✅
├── scripts/
│   └── migrate-roles.ts              ✅
├── routes/
│   ├── companyRoutes.ts              ✅
│   ├── masterRoutes.ts               ✅
│   └── index.ts                      ✅ (atualizado)
├── @types/
│   └── express.d.ts                  ✅ (atualizado)
└── middleware/
    └── AuthMiddleware.ts             ✅ (atualizado)
```

---

## Decisões Técnicas ✅ DEFINIDAS

| Item | Decisão | Status |
|------|---------|--------|
| CPF vs CNPJ único | CPF no User (dono), CNPJ na Company | ✅ |
| Convite funcionário | Email + token 7 dias + link `/accept-invite/:token` | ✅ |
| Trial 30 dias | `planExpiresAt`, bloqueia check-in se expirado | ✅ |
| Soft delete empresa | `status: CANCELLED` + job limpeza 90 dias | ✅ |
| Logs auditoria master | Auditar ações do MASTER separadamente | ✅ |
| Rate limiting | Por companyId + plan tier (não IP) | ✅ Prepar

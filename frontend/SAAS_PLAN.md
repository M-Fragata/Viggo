# Plano SaaS Multi-Tenancy - Frontend Viggo

## Visão Geral
Adaptar o frontend para suportar multi-tenancy, fluxo de signup self-service, dashboard admin enriquecido e gestão de planos.

---

## FASE 1: Auth Flow & Landing (Semana 1-2)

### 1.1 Landing Page → Signup Flow
**Nova página**: `/signup-company` (ou modal no landing)
```
Campos:
- Nome completo (dono)
- Email
- CPF (validação único + máscara)
- CNPJ (opcional, máscara, validação único)
- Nome da empresa
- Senha + confirmação

Validações:
- CPF/CNPJ únicos (chamada API real-time)
- Senha forte (min 8 chars, maiúscula, número, especial)
- Termos de uso + LGPD checkbox

Sucesso:
- Cria empresa + admin no backend (POST /companies/signup)
- Login automático + redirect para /admin
- Toast "Empresa criada! Trial de 30 dias iniciado."
```

### 1.2 Login Page Atualizado
- Detectar se email é MASTER (`isMaster: true`) → redirect para `/master`
- Detectar se empresa está `SUSPENDED`/`CANCELLED` → bloquear + mensagem
- Detectar trial expirado (`planExpiresAt` < now) → avisar upgrade
- Mostrar dias restantes de trial no dashboard (header/banner)

### 1.3 Invite Flow - Página Pública
**Rota**: `/accept-invite/:token` (pública, sem auth)

```
FLUXO:
1. Admin cria convite: POST /companies/me/invites { email, role }
   → Retorna inviteUrl = "/accept-invite/:token"

2. Funcionário acessa /accept-invite/:token
   → GET /companies/invites/:token (público)
   → Mostra: Nome empresa, role, expiração

3. Funcionário preenche: Nome + Senha + Confirmação
   → POST /companies/invites/accept { token, name, password }
   → Cria User + Login automático + Redirect /admin

ADMIN ACTIONS:
- Cancelar convite (DELETE /companies/me/invites/:id)
- Reenviar = Cancelar + Criar novo (gera novo token/link)
```

---

## FASE 2: Admin Dashboard - Abas Novas (Semana 2-3)

### 2.1 Estrutura de Abas Atualizada
```
┌─────────────────────────────────────────────────────────────┐
│  Viggo Logo    Olá, [Nome]    [Menu ☰]                      │
├─────────────────────────────────────────────────────────────┤
│  [Funcionários] [Presentes] [Total] [Plano] [Convites]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONTEÚDO DA ABA SELECIONADA                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Novas Abas

#### **ABA: Plano** (`/admin?tab=plan`)
| Seção | Conteúdo |
|-------|----------|
| **Plano Atual** | Badge do tier (I/II/III/Custom), preço mensal |
| **Trial/Validade** | Contagem regressiva (ex: "15 dias restantes") ou "Renova em DD/MM" |
| **Limite Funcionários** | Progress bar: `X / Y` funcionários + % uso |
| **Botão Upgrade** | Abre modal com comparação de tiers |
| **Status** | Badge: TRIAL / ACTIVE / SUSPENDED |

#### **ABA: Convites** (`/admin?tab=invites`)
| Funcionalidade | Detalhes |
|----------------|----------|
| **Enviar Convite** | Modal: Email, Role (Admin/Funcionário) |
| **Lista Pendentes** | Tabela: Email, Role, Enviado em, Expira em, Status, Ações |
| **Ações** | Cancelar (DELETE), Copiar link |
| **Validação** | Limite por plano (TIER_I: 10, TIER_II: 50, etc.) |

> **Nota**: Aba "Configurações" e "Uso & API" deixadas para implementação futura.

---

## FASE 3: Componentes Compartilhados (Semana 2)

### 3.1 Novos Componentes
```typescript
// components/plan/
PlanBadge.tsx              // Badge visual do tier (cores por tier)
PlanComparisonModal.tsx    // Modal lado a lado dos tiers
UsageProgressBar.tsx       // Barra X/Y com cor de alerta
TrialCountdown.tsx         // Contagem regressiva animada

// components/company/
InviteModal.tsx            // Form enviar convite (email + role)
InviteTable.tsx            // Lista convites com ações (cancelar, copiar link)
AcceptInvitePage.tsx       // Página /accept-invite/:token
```

### 3.2 Hooks Novos
```typescript
// hooks/
useCompany.ts           // GET /companies/me + GET /companies/me/usage
usePlanLimits.ts        // Limites do tier atual (static ou fetched)
useInvites.ts           // CRUD convites (list, create, cancel)
useAuth.ts              // Login, logout, detect isMaster/status
```

---

## FASE 4: Master Dashboard (Semana 3-4)

### 4.1 Nova Rota: `/master`
**Acesso**: Apenas `role === MASTER` (detectado no login)

### 4.2 Layout Master
```
┌─────────────────────────────────────────────────────────────┐
│  Viggo Master    [Métricas] [Empresas] [Sair]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  KPIs:  [Total: 47]  [Ativas: 42]  [Trial: 3]  [MRR: R$]   │
│                                                             │
│  Filtros: [Status ▼] [Plano ▼] [Buscar CNPJ/Nome...]        │
│                                                             │
│  Tabela Empresas:                                           │
│  ┌──────┬──────────┬───────┬───────┬────────┬────────┬─────┐
│  │ Logo │ Empresa  │ CNPJ  │ Plano │ Status │ Funcs  │ Ações│
│  ├──────┼──────────┼───────┼───────┼────────┼────────┼─────┤
│  │  🏢  │ Acme Ltda│ 12.34 │ Tier II│ Active │ 23/50  │ ⋮   │
│  └──────┴──────────┴───────┴───────┴────────┴────────┴─────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Ações Master por Empresa
- Ver detalhes (readonly) - `GET /master/companies/:id`
- Alterar plano - `PUT /master/companies/:id/plan` (override: cortesia, upgrade, downgrade)
- Suspender/Reativar - `PUT /master/companies/:id/status`
- Estender trial - `POST /master/companies/:id/extend-trial` (+7, +15, +30 dias)

> **Nota**: "Impersonar" (login como admin da empresa) deixado para implementação futura.

---

## FASE 5: Validações & UX (Contínuo)

### 5.1 Validações Frontend
- CPF/CNPJ: Máscara + validação dígito verificador (usar `cpfCnpjValidator` logic)
- Senha: Medidor de força visual
- Email: Verificação de domínio temporário (block)

### 5.2 Estados de Loading/Error
- Skeleton loaders nas tabelas
- Toast padronizado (sucesso, erro, aviso, info)
- Empty states ilustrados
- Error boundaries por feature

### 5.3 Responsividade
- Mobile: Abas viram accordion
- Tabelas: Horizontal scroll + sticky first column
- Modais: Full screen em mobile

---

## Integração Backend - Contratos de API (Baseados no Backend Real)

### Company Endpoints
```typescript
// POST /companies/signup
interface SignupCompanyDto {
  name: string           // nome do dono
  email: string
  cpf: string            // CPF formatado
  cnpj?: string          // CNPJ formatado (opcional)
  companyName: string
  password: string
  confirmPassword: string
}

interface SignupCompanyResponse {
  user: { id, name, email, role, companyId, cpf }
  company: { id, name, plan, status, planExpiresAt, maxEmployees }
  token: string
}

// GET /companies/me
interface CompanyResponse {
  id: string
  name: string
  cnpj: string | null
  plan: PlanTier
  status: CompanyStatus
  planExpiresAt: string | null
  maxEmployees: number
  currentEmployees: number
  employeeUsagePercent: number
  canCreateEmployee: boolean
  settings: CompanySettings
  trialUsed: boolean
  createdAt: string
}

// PUT /companies/me
interface UpdateCompanyDto {
  name?: string
  settings?: Partial<CompanySettings>
}

interface CompanySettings {
  logo?: string | null
  primaryColor?: string
  timezone?: string
  checkinToleranceMinutes?: number
  lunchToleranceMinutes?: number
  requirePhoto?: boolean
  requireBiometry?: boolean
}

// GET /companies/me/usage
interface UsageResponse {
  employees: { current: number, limit: number, percentage: number }
  checkins: { thisMonth: number, total: number }
  apiLimits: { general: number, checkin: number, faceValidation: number }
  plan: PlanTier
}

// POST /companies/me/invites
interface CreateInviteDto {
  email: string
  role: 'ENTERPRISE_ADMIN' | 'EMPLOYEE'
}

interface InviteResponse {
  id: string
  email: string
  role: UserRole
  expiresAt: string
  inviteUrl: string
  createdA

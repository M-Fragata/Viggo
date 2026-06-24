# Plano SaaS Multi-Tenancy - Frontend Viggo

## Visão Geral
Adaptar o frontend para suportar multi-tenancy, fluxo de signup self-service, dashboard admin enriquecido e gestão de planos.

---

## FASE 1: Auth Flow & Landing (Semana 1-2) ✅ CONCLUÍDA

### 1.1 Landing Page → Signup Flow
**Nova página**: `/signup-company` (ou modal no landing) - **PENDENTE** (deixado para o final conforme decisão)

### 1.2 Login Page Atualizado ✅ CONCLUÍDA
- Detectar se email é MASTER (`isMaster: true`) → redirect para `/master`
- Detectar se empresa está `SUSPENDED`/`CANCELLED` → bloquear + mensagem
- Detectar trial expirado (`planExpiresAt` < now) → avisar upgrade
- Mostrar dias restantes de trial no dashboard (header/banner)
- Removido link "Criar conta" para `/signup`

### 1.3 Invite Flow - Página Pública ✅ CONCLUÍDA
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

**Implementado**: `AcceptInvitePage.tsx` - página completa com validação de token, expiração, formulário com react-hook-form + Zod

---

## FASE 2: Admin Dashboard - Abas Novas (Semana 2-3) ✅ CONCLUÍDA

### 2.1 Estrutura de Abas Atualizada ✅
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

### 2.2 Novas Abas ✅

#### **ABA: Plano** (`/admin?tab=plan`) ✅
| Seção | Conteúdo |
|-------|----------|
| **Plano Atual** | Badge do tier (I/II/III/Custom), preço mensal |
| **Trial/Validade** | Contagem regressiva (ex: "15 dias restantes") ou "Renova em DD/MM" |
| **Limite Funcionários** | Progress bar: `X / Y` funcionários + % uso |
| **Botão Upgrade** | Abre modal com comparação de tiers |
| **Status** | Badge: TRIAL / ACTIVE / SUSPENDED |

#### **ABA: Convites** (`/admin?tab=invites`) ✅
| Funcionalidade | Detalhes |
|----------------|----------|
| **Enviar Convite** | Modal: Email, Role (Admin/Funcionário) |
| **Lista Pendentes** | Tabela: Email, Role, Enviado em, Expira em, Status, Ações |
| **Ações** | Cancelar (DELETE), Copiar link |
| **Validação** | Limite por plano (TIER_I: 10, TIER_II: 50, etc.) |

> **Nota**: Aba "Configurações" e "Uso & API" deixadas para implementação futura.

---

## FASE 3: Componentes Compartilhados (Semana 2) ✅ CONCLUÍDA

### 3.1 Novos Componentes ✅
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

### 3.2 Hooks Novos ✅
```typescript
// hooks/
useCompany.ts           // GET /companies/me + GET /companies/me/usage
usePlanLimits.ts        // Limites do tier atual (static)
useInvites.ts           // CRUD convites (list, create, cancel)
useAuth.ts              // Login, logout, detect isMaster/status
useToast.ts             // Wrapper sonner para toasts
useMaster.ts            // Master dashboard hooks
```

### 3.3 Service Layer ✅
```typescript
// services/api.ts - Todos os endpoints tipados
- auth: login, signup
- company: getMe, updateMe, getUsage, invites (list, create, cancel)
- company.public: getInviteByToken, acceptInvite
- master: listCompanies, getCompany, getMetrics, updatePlan, updateStatus, extendTrial
```

---

## FASE 4: Master Dashboard (Semana 3-4) ✅ CONCLUÍDA

### 4.1 Nova Rota: `/master` ✅
**Acesso**: Apenas `role === MASTER` (detectado no login via `isMaster`)

### 4.2 Layout Master ✅
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

### 4.3 Ações Master por Empresa ✅
- Ver detalhes (readonly) - `GET /master/companies/:id`
- Alterar plano - `PUT /master/companies/:id/plan` (override: cortesia, upgrade, downgrade)
- Suspender/Reativar - `PUT /master/companies/:id/status`
- Estender trial - `POST /master/companies/:id/extend-trial` (+7 a +90 dias)

> **Nota**: "Impersonar" (login como admin da empresa) deixado para implementação futura.

### 4.4 Páginas Implementadas ✅
- `MasterDashboard.tsx` - KPIs, distribuição por plano, churn/crescimento
- `MasterCompanies.tsx` - Tabela paginada com filtros, ações dropdown
- `MasterLayout.tsx` - Layout com navegação lateral responsiva

---

## FASE 5: Validações & UX (Contínuo) ✅ PARCIALMENTE CONCLUÍDA

### 5.1 Validações Frontend
- ✅ Senha: Mínimo 8 chars, validação Zod em tempo real
- ✅ Email: Validação Zod email format
- ⏳ CPF/CNPJ: Máscara + validação dígito verificador (pendente - usar lógica do backend)
- ⏳ Email: Verificação de domínio temporário (pendente)

### 5.2 Estados de Loading/Error ✅
- ✅ Skeleton loaders nas tabelas (spinner simples)
- ✅ Toast padronizado via sonner (sucesso, erro, aviso, info)
- ✅ Empty states ilustrados (ex: sem convites, sem funcionários)
- ⏳ Error boundaries por feature (pendente)

### 5.3 Responsividade ✅
- ✅ Mobile: Abas com scroll horizontal
- ✅ Tabelas: Horizontal scroll + sticky first column
- ✅ Modais: Usam `<dialog>` nativo, responsivos
- ✅ Master layout: Menu hamburger em mobile

---

## Decisões Técnicas Implementadas ✅

| Item | Decisão | Status |
|------|---------|--------|
| Toast library | **sonner** | ✅ |
| Modal/Dialog | **`<dialog>` nativo** | ✅ |
| Form validation | **react-hook-form + @hookform/resolvers (Zod)** | ✅ |
| Date handling | **date-fns** (consistente com backend) | ✅ |
| Pagination Master | **Server-side tradicional** | ✅ |
| Routing | **react-router v7** com rotas protegidas | ✅ |
| State management | **React hooks + localStorage** (token/user) | ✅ |

---

## Estrutura de Arquivos Implementada ✅

```
frontend/src/
├── services/
│   └── api.ts                    # Todos os endpoints tipados
├── hooks/
│   ├── useAuth.ts               # Auth + company status
│   ├── useCompany.ts            # Company data + plan limits
│   ├── useInvites.ts            # Invites CRUD + public accept
│   ├── useMaster.ts             # Master dashboard hooks
│   └── useToast.ts              # Sonner wrapper
├── components/
│   ├── plan/
│   │

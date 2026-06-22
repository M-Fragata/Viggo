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
- Cria empresa + admin no backend
- Login automático + redirect para /admin
- Toast "Empresa criada! Trial de 30 dias iniciado."
```

### 1.2 Login Page Atualizado
- Detectar se email é MASTER (redireciona para /master)
- Detectar se empresa está SUSPENDED/CANCELLED (bloquear + mensagem)
- Mostrar dias restantes de trial no dashboard

---

## FASE 2: Admin Dashboard - Abas Novas (Semana 2-3)

### 2.1 Estrutura de Abas Atualizada
```
┌─────────────────────────────────────────────────────────────┐
│  Viggo Logo    Olá, [Nome]    [Menu ☰]                      │
├─────────────────────────────────────────────────────────────┤
│  [Funcionários] [Presentes] [Total] [Plano] [Config] [Conv] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONTEÚDO DA ABA SELECIONADA                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Novas Abas

#### **ABA: Plano & Cobrança** (`/admin?tab=plan`)
| Seção | Conteúdo |
|-------|----------|
| **Plano Atual** | Badge do tier (I/II/III/Custom), preço mensal |
| **Trial/Validade** | Contagem regressiva (ex: "15 dias restantes") ou "Renova em DD/MM" |
| **Limite Funcionários** | Progress bar: `X / Y` funcionários |
| **Botão Upgrade** | Abre modal com comparação de tiers |
| **Histórico** | Tabela: Plano, Período, Valor, Status, Fatura (link PDF) |
| **Aviso** | Se trial: "Adicione forma de pagamento para continuar" |

#### **ABA: Configurações** (`/admin?tab=settings`)
| Seção | Campos |
|-------|--------|
| **Identidade** | Logo upload, Nome fantasia, Razão social, CNPJ |
| **Aparência** | Cor primária (color picker), Modo escuro/claro |
| **Regras de Ponto** | Tolerância entrada (min), Tolerância almoço (min), Fuso horário |
| **Notificações** | Email lembrete ponto, WhatsApp (futuro), Push |
| **Segurança** | Exigir foto no check-in, Biometria obrigatória |
| **Integrações** | Webhook URLs, API Key (futuro) |

#### **ABA: Convites** (`/admin?tab=invites`)
| Funcionalidade | Detalhes |
|----------------|----------|
| **Enviar Convite** | Modal: Email, Role (Admin/Funcionário), Mensagem custom |
| **Lista Pendentes** | Tabela: Email, Role, Enviado em, Expira em, Status, Ações |
| **Ações** | Reenviar, Cancelar, Copiar link |
| **Validação** | Limite por plano (TIER_I: 10, TIER_II: 50, etc.) |

#### **ABA: Uso & API** (`/admin?tab=usage`)
| Métrica | Exibição |
|---------|----------|
| **Rate Limit** | Barras: API Geral, Check-in, Face Validation |
| **Uso Diário** | Gráfico últimos 30 dias |
| **Webhooks** | Lista configurados + status último envio |
| **Logs** | Últimas 50 ações (auditoria simplificada) |

---

## FASE 3: Componentes Compartilhados (Semana 2)

### 3.1 Novos Componentes
```typescript
// components/plan/
PlanBadge.tsx           // Badge visual do tier (cores por tier)
PlanComparisonModal.tsx // Modal lado a lado dos tiers
UsageProgressBar.tsx    // Barra X/Y com cor de alerta
TrialCountdown.tsx      // Contagem regressiva animada

// components/company/
InviteModal.tsx         // Form enviar convite
InviteTable.tsx         // Lista convites com ações
SettingsForm.tsx        // Form configurações empresa
CompanyLogoUpload.tsx   // Upload + preview + crop

// components/master/ (apenas role MASTER)
MasterCompanyCard.tsx   // Card na lista de empresas
MasterMetricsCards.tsx  // KPIs globais
MasterPlanSelector.tsx  // Dropdown override plano
```

### 3.2 Hooks Novos
```typescript
// hooks/
useCompany.ts           // Dados da empresa + plano + limites
usePlanLimits.ts        // Limites do tier atual
useInvites.ts           // CRUD convites
useMaster.ts            // Apenas MASTER: listar empresas, métricas
```

---

## FASE 4: Master Dashboard (Semana 3-4)

### 4.1 Nova Rota: `/master`
**Acesso**: Apenas `role === MASTER`

### 4.2 Layout Master
```
┌─────────────────────────────────────────────────────────────┐
│  Viggo Master    [Métricas] [Empresas] [Config] [Sair]      │
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
- Ver detalhes (readonly)
- Alterar plano (override: cortesia, upgrade, downgrade)
- Suspender/Reativar
- Estender trial (+7, +15, +30 dias)
- Ver logs de auditoria
- Impersonar (login como admin da empresa)

---

## FASE 5: Validações & UX (Contínuo)

### 5.1 Validações Frontend
- CPF/CNPJ: Máscara + validação dígito verificador
- CNPJ: Consulta ReceitaWS (opcional, preenchimento auto)
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

## Integração Backend - Contratos de API

### Company Endpoints
```typescript
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
  settings: CompanySettings
  trialUsed: boolean
}

// PUT /companies/me
interface UpdateCompanyDto {
  name?: string
  settings?: Partial<CompanySettings>
}

// GET /companies/me/usage
interface UsageResponse {
  employees: { current: number, limit: number, percentage: number }
  apiCalls: { general: number, checkin: number, face: number }
  period: { start: string, end: string }
}

// POST /companies/me/invites
interface CreateInviteDto {
  email: string
  role: 'ENTERPRISE_ADMIN' | 'EMPLOYEE'
  message?: string
}

// GET /companies/me/invites
interface InviteResponse {
  id: string
  email: string
  role: UserRole
  expiresAt: string
  usedAt: string | null
  createdAt: string
}
```

### Master Endpoints
```typescript
// GET /master/companies
interface MasterCompanyListItem {
  id: string
  name: string
  cnpj: string | null
  plan: PlanTier
  status: CompanyStatus
  planExpiresAt: string | null
  employeesCount: number
  maxEmployees: number
  createdAt: string
  lastActivityAt: string | null
}

// GET /master/metrics
interface MasterMetrics {
  totalCompanies: number
  activeCompanies: number
  trialCompanies: number
  suspendedCompanies: number
  mrr: number
  churnRate: number
  dailyCheckins: number
  planDistribution: Record<PlanTier, number>
}
```

---

## Arquivos a Criar/Modificar

```
frontend/src/
├── pages/
│   ├── S

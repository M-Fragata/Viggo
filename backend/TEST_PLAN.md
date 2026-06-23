# Plano de Testes - Backend Viggo (SaaS Multi-Tenancy)

## Visão Geral
Este documento define a estratégia de testes para o backend Viggo, utilizando **Vitest** + **Supertest** com mocks em memória (sem banco de dados real).

---

## Stack de Testes
- **Vitest** - Test runner e assertion library
- **Supertest** - Testes de integração HTTP
- **Vitest Mocks** - Mocks em memória para Prisma, JWT, Bcrypt
- **MSW (Mock Service Worker)** - Opcional para mocks de HTTP externos

---

## Estrutura de Pastas

```
backend/
├── src/
│   └── test/
│       ├── setup.ts                 # Configuração global (beforeEach/afterEach)
│       ├── mocks/
│       │   ├── prisma.mock.ts       # Mock do Prisma Client em memória
│       │   ├── jwt.mock.ts          # Mock do JWT
│       │   ├── bcrypt.mock.ts       # Mock do Bcrypt
│       │   └── factories/
│       │       ├── company.factory.ts
│       │       ├── user.factory.ts
│       │       ├── invite.factory.ts
│       │       └── subscription.factory.ts
│       ├── utils/
│       │   ├── test-app.ts          # Cria app Express para testes
│       │   ├── auth-helpers.ts      # Helpers para gerar tokens JWT
│       │   └── request-helpers.ts   # Wrappers do supertest
│       ├── unit/
│       │   ├── controllers/
│       │   │   ├── CompanyController.test.ts
│       │   │   └── MasterController.test.ts
│       │   ├── middleware/
│       │   │   ├── AuthMiddleware.test.ts
│       │   │   ├── PlanMiddleware.test.ts
│       │   │   └── RoleGuard.test.ts
│       │   └── utils/
│       │       ├── planLimits.test.ts
│       │       └── cpfCnpjValidator.test.ts
│       └── integration/
│           ├── companyRoutes.test.ts
│           ├── masterRoutes.test.ts
│           ├── sessionRoutes.test.ts
│           ├── checkinRoutes.test.ts
│           └── employeesRoutes.test.ts
```

---

## Configuração Global (`setup.ts`)

```typescript
// Limpa todos os mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks();
  // Reset in-memory stores
  prismaMock.$reset();
  jwtMock.$reset();
  bcryptMock.$reset();
});

// Configura variáveis de ambiente para testes
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.NODE_ENV = 'test';
});
```

---

## Mock do Prisma em Memória (`prisma.mock.ts`)

### Estratégia: In-Memory Store
- Usa `Map<string, T[]>` para cada modelo
- Implementa métodos: `findUnique`, `findFirst`, `findMany`, `create`, `update`, `delete`, `count`, `groupBy`
- Suporta `select`, `include`, `where`, `orderBy`, `skip`, `take`
- Simula relacionamentos via `where relations via `include`

```typescript
// Exemplo de estrutura
const companies = new Map<string, Company>();
const users = new Map<string, User>();
const inviteTokens = new Map<string, InviteToken>();
const subscriptions = new Map<string, Subscription>();
const checkIns = new Map<string, CheckIn>();

export const prismaMock = {
  company: { /* CRUD methods */ },
  user: { /* CRUD methods */ },
  inviteToken: { /* CRUD methods */ },
  subscription: { /* CRUD methods */ },
  checkIn: { /* CRUD methods */ },
  $reset: () => { /* limpa todos os Maps */ },
  $transaction: async (fn) => await fn(prismaMock), // suporte a transações
};
```

---

## Factories de Dados (`factories/`)

```typescript
// company.factory.ts
export const createCompanyFactory = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: 'Empresa Teste',
  cnpj: '12.345.678/0001-90',
  plan: PlanTier.TIER_I,
  status: CompanyStatus.TRIAL,
  maxEmployees: 10,
  planExpiresAt: addDays(new Date(), 30),
  trialUsed: true,
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// user.factory.ts
export const createUserFactory = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: 'João Silva',
  email: 'joao@teste.com',
  password: 'hashed_password',
  cpf: '123.456.789-00',
  role: UserRole.ENTERPRISE_ADMIN,
  companyId: 'company-id',
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

---

## Helpers de Autenticação (`auth-helpers.ts`)

```typescript
export const generateTestToken = (payload: Partial<JWTPayload> = {}) => {
  const defaultPayload: JWTPayload = {
    id: 'user-id',
    role: UserRole.ENTERPRISE_ADMIN,
    companyId: 'company-id',
    planTier: PlanTier.TIER_I,
    isMaster: false,
    ...payload,
  };
  return jwt.sign(defaultPayload, process.env.JWT_SECRET!, { expiresIn: '7d' });
};

export const createAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
```

---

## Convenção de Nomes dos Testes

### Padrão: `Should <ação esperada> when <condição>`

| Cenário | Exemplo |
|---------|---------|
| Sucesso | `Should create a enterprise when valid data provided` |
| Validação | `Should return 400 when email is invalid` |
| Autorização | `Should return 403 when user is not enterprise admin` |
| Não encontrado | `Should return 404 when company does not exist` |
| Conflito | `Should return 400 when CPF already registered` |
| Expiração | `Should return 403 when trial expired` |
| Limite | `Should return 403 when employee limit reached` |

---

## Testes Unitários por Módulo

### 1. CompanyController (`unit/controllers/CompanyController.test.ts`)

#### `signup`
- ✅ Should create a enterprise when valid data provided
- ✅ Should return 400 when passwords do not match
- ✅ Should return 400 when CPF is invalid
- ✅ Should return 400 when CNPJ is invalid
- ✅ Should return 400 when email already registered
- ✅ Should return 400 when CPF already registered
- ✅ Should return 400 when CNPJ already registered
- ✅ Should return 201 with token, user and company on success
- ✅ Should create subscription with TRIAL status

#### `getMe`
- ✅ Should return company with plan limits and usage when authenticated
- ✅ Should return 401 when companyId not in token
- ✅ Should return 404 when company not found

#### `updateMe`
- ✅ Should update company name when valid data provided
- ✅ Should update settings when valid data provided
- ✅ Should return 400 when primaryColor format invalid
- ✅ Should return 401 when not authenticated
- ✅ Should return 403 when not enterprise admin (via middleware)

#### `getUsage`
- ✅ Should return employees, checkins and api limits
- ✅ Should calculate correct usage percentage
- ✅ Should return 401 when not authenticated

#### `createInvite`
- ✅ Should create invite when valid email and role provided
- ✅ Should return 400 when email already registered
- ✅ Should return 400 when pending invite exists for email
- ✅ Should return 403 when employee limit reached
- ✅ Should return 403 when not enterprise admin
- ✅ Should return invite with inviteUrl

#### `listInvites`
- ✅ Should return all invites for company ordered by createdAt desc
- ✅ Should return 401 when not authenticated

#### `cancelInvite`
- ✅ Should cancel invite when valid id provided
- ✅ Should return 404 when invite not found
- ✅ Should return 400 when invite already used
- ✅ Should return 403 when not enterprise admin

#### `acceptInvite`
- ✅ Should accept invite and create user when valid token provided
- ✅ Should return 400 when passwords do not match
- ✅ Should return 404 when invite not found
- ✅ Should return 400 when invite already used
- ✅ Should return 400 when invite expired
- ✅ Should return 400 when email already registered
- ✅ Should return token and user on success
- ✅ Should mark invite as used

#### `getInviteByToken`
- ✅ Should return invite details when valid token
- ✅ Should return 404 when token not found
- ✅ Should return 400 when invite used
- ✅ Should return 400 when invite expired

---

### 2. MasterController (`unit/controllers/MasterController.test.ts`)

#### `listCompanies`
- ✅ Should return paginated companies with usage
- ✅ Should filter by status when provided
- ✅ Should filter by plan when provided
- ✅ Should search by name or cnpj when search provided
- ✅ Should return 400 when invalid pagination params
- ✅ Should return 403 when not master (via middleware)

#### `getCompanyDetails`
- ✅ Should return full company details with users and subscriptions
- ✅ Should return 404 when company not found
- ✅ Should return 400 when invalid uuid

#### `getMetrics`
- ✅ Should return all metrics (companies, users, checkins, revenue, churn)
- ✅ Should calculate MRR correctly based on plan distribution
- ✅ Should calculate churn rate
- ✅ Should calculate growth rate

#### `updateCompanyPlan`
- ✅ Should update company plan and create subscription
- ✅ Should activate company when upgrading from trial
- ✅ Should use custom maxEmployees when provided
- ✅ Should return 404 when company not found
- ✅ Should return 400 when invalid plan

#### `updateCompanyStatus`
- ✅ Should update company status to ACTIVE/SUSPENDED/CANCELLED
- ✅ Should return 404 when company not found
- ✅ Should return 400 when invalid status

#### `extendTrial`
- ✅ Should extend trial by N days (1-90)
- ✅ Should calculate from existing planExpiresAt when exists
- ✅ Should calculate from now when planExpiresAt null
- ✅ Should return 404 when company not found
- ✅ Should return 400 when days out of range

---

### 3. Middleware Tests

#### AuthMiddleware (`unit/middleware/AuthMiddleware.test.ts`)
- ✅ Should attach user to request when valid token
- ✅ Should set prisma context (companyId, userId)
- ✅ Should clear prisma context on response finish
- ✅ Should return 401 when no authorization header
- ✅ Should return 401 when token missing
- ✅ Should return 401 when token invalid
- ✅ Should return 401 when token expired
- ✅ Should include isMaster in user when present

#### PlanMiddleware (`unit/middleware/PlanMiddleware.test.ts`)
##### `getCompanyPlanInfo`
- ✅ Should return plan info with trial days remaining
- ✅ Should return null when company not found
- ✅ Should calculate trialDaysRemaining correctly
- ✅ Should set isTrial true when status TRIAL

##### `requireActivePlan`
- ✅ Should call next when plan ACTIVE
- ✅ Should return 403 when status SUSPENDED
- ✅ Should return 403 when status CANCELLED
- ✅ Should return 403 when trial expired
- ✅ Should return 403 when planInfo missing

##### `requireEmployeeLimit`
- ✅ Should call next when under limit
- ✅ Should return 403 when limit reached
- ✅ Should return 403 when planInfo missing
- ✅ Should allow unlimited when maxEmployees null

##### `planMiddleware`
- ✅ Should attach planInfo to request when companyId in token
- ✅ Should return 401 when companyId missing
- ✅ Should return 403 when company not found

#### RoleGuard (`unit/middleware/RoleGuard.test.ts`)
- ✅ Should allow MASTER for requireMaster
- ✅ Should allow ENTERPRISE_ADMIN and MASTER for requireEnterpriseAdmin
- ✅ Should allow EMPLOYEE, ENTERPRISE_ADMIN, MASTER for requireEmployeeOrAbove
- ✅ Should return 401 when no user
- ✅ Should return 403 when role not allowed
- ✅ Should return correct requiredRoles and currentRole in error

##### Helper Functions
- ✅ `isMaster` should return true for MASTER role
- ✅ `isEnterpriseAdmin` should return true for ENTERPRISE_ADMIN
- ✅ `isEmployee` should return true for EMPLOYEE
- ✅ `canManageCompany` should return true for MASTER
- ✅ `canManageCompany` should return true for ENTERPRISE_ADMIN same company
- ✅ `canManageCompany` should return false for ENTERPRISE_ADMIN different company
- ✅ `canAccessMasterRoutes` should return true only for MASTER

---

### 4. Utils Tests

#### planLimits (`unit/utils/planLimits.test.ts`)
- ✅ `getPlanLimits` should return correct limits for each tier
- ✅ `getPlanLimits` should return TIER_I for unknown plan
- ✅ `canCreateEmployee` should return true when under limit
- ✅ `canCreateEmployee` should return false when at limit
- ✅ `canCreateEmployee` should return true when unlimited (ENTERPRISE_CUSTOM)
- ✅ `getEmployeeUsagePercentage` should calculate correct percentage
- ✅ `getEmployeeUsagePercentage` should return 0 when unlimited
- ✅ `isTrialExpired` should return true when date passed
- ✅ `isTrialExpired` should return false when date future
- ✅ `isTrialExpired` should return false when null
- ✅ `getTrialDaysRemaining` should return correct days
- ✅ `getTrialDaysRemaining` should return 0 when expired
- ✅ `getTrialDaysRemaining` should return 0 when null

#### cpfCnpjValidator (`unit/utils/cpfCnpjValidator.test.ts`)
- ✅ `validateCPF` should return true for valid CPF
- ✅ `validateCPF` should return false for invalid CPF
- ✅ `validateCPF` should return false for all same digits
- ✅ `validateCNPJ` should return true for valid CNPJ
- ✅ `validateCNPJ` should return false for invalid CNPJ
- ✅ `validateCNPJ` should return false for all same digits
- ✅ `formatCPF` should format correctly
- ✅ `formatCNPJ` should format correctly
- ✅ `detectDocumentType` should return CPF for 11 digits
- ✅ `detectDocumentType` should return CNPJ for 14 digits
- ✅ `detectDocumentType` should return INVALID for other lengths
- ✅ `validateDocument` should return formatted CPF for valid CPF
- ✅ `validateDocument` should return formatted CNPJ for valid CNPJ
- ✅ `validateDocument` should return invalid for invalid docs
- ✅ `maskCPF` should mask progressively
- ✅ `maskCNPJ` should mask progressively

---

## Testes de Integração (`integration/`)

### companyRoutes.test.ts
- ✅ POST /companies/signup - Should create enterprise and return 201
- ✅ POST /companies/signup - Should return 400 for invalid data
- ✅ GET /companies/invites/:token - Should return invite details
- ✅ POST /companies/invites/accept - Should accept invite and return token
- ✅ GET /companies/me - Should return company with limits (auth required)
- ✅ PUT /companies/me - Should update company (admin required)
- ✅ GET /companies/me/usage - Should return usage stats
- ✅ POST /companies/me/invites - Should create invite (admin + limit check)
- ✅ GET /companies/me/invites - Should list invites (admin required)
- ✅ DELETE /companies/me/invites/:id - Should cancel invite (admin required)

### masterRoutes.test.ts
- ✅ GET /master/companies - Should list companies with pagination
- ✅ GET /master/companies/:id - Should return company details
- ✅ GET /master/metrics - Should return dashboard metrics
- ✅ PUT /master/companies/:id/plan - Should update plan
- ✅ PUT /master/companies/:id/status - Should update status
- ✅ POST /master/companies/:id/extend-trial - Should extend trial
- ✅ All routes should return 403 when not master

### sessionRoutes.test.ts
- ✅ POST /sessions/login - Should return token for valid credentials
- ✅ POST /sessions/login - Should return 401 for invalid credentials
- ✅ POST /sessions/refresh - Should refresh token
- ✅ POST /sessions/logout - Should invalidate token

### checkinRoutes.test.ts
- ✅ POST /checkins - Should create checkin
- ✅ GET /checkins - Should list checkins
- ✅ GET /checkins/:id - Should return checkin details
- ✅ PUT /checkins/:id - Should update checkin
- ✅ DELETE /checkins/:id - Should delete checkin

### employeesRoutes.test.ts
- ✅ GET /employees - Should list employees
- ✅ POST /employees - Should create employee
- ✅ GET /employees/:id - Should return employee
- ✅ PUT /employees/:id - Should update employee
- ✅ DELETE /employees/:id - Should delete employee

---

## Cobertura Mínima Esperada

| Tipo | Cobertura |
|------|-----------|
| Statements | 85%+ |
| Branches | 80%+ |
| Functions | 90%+ |
| Lines | 85%+ |

---

## Execução dos Testes

```bash
# Instalar dependências
npm install -D vitest supertest @types/supertest

# Executar todos os testes
npm test

# Executar com cobertura
npm test -- --coverage

# Executar apenas unitários
npm test -- unit

# Executar apenas integração
npm test -- integration

# Watch mode
npm test -- --watch
```

---

## Scripts package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run --reporter=verbose src/test/unit",
    "test:integration": "vitest run --reporter=verbose src/test/integration"
  }
}
```

---

## Dependências de Desenvolvimento a Adicionar

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```

---

## Princípios de Design dos Testes

1. **Isolamento Total** - Cada teste roda com store limpo (beforeEach)
2. **Sem Banco Real** - Tudo em memória via mocks
3. **Nomes Semânticos** - `it("Should <action> when <condition>")`
4. **AAA Pattern** - Arrange, Act, Assert
5. **Um Assert por Teste** - Preferencialmente
6. **Factory Pattern** - Dados de teste consistentes e customizáveis
7. **Testes de Borda** - Validações, limites, expiração, conflitos
8. **Testes de Erro** - Códigos de erro corretos, mensagens claras
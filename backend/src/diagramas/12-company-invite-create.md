# Fluxo: Criar Convite Funcionário - POST /companies/me/invites

## Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant Metrics as MetricsMiddleware
    participant CompanyRoute as Company Routes
    participant AuthMiddleware as AuthMiddleware
    participant PlanMiddleware as PlanMiddleware
    participant RequireEnterpriseAdmin as RequireEnterpriseAdmin
    participant RequireEmployeeLimit as RequireEmployeeLimit
    participant CompanyCtrl as CompanyController.createInvite
    participant Prisma as Prisma Client
    participant DB as PostgreSQL
    participant Crypto as crypto.randomBytes
    participant PlanLimits as planLimits.ts

    Client->>Express: POST /companies/me/invites {email, role?, message?}
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min
    RateLimit-->>Express: OK
    Express->>Metrics: Coleta métricas
    Metrics-->>Express: Next
    Express->>CompanyRoute: Roteamento

    CompanyRoute->>AuthMiddleware: **Autenticação**
    AuthMiddleware->>AuthMiddleware: jwt.verify + setCurrentCompanyId
    AuthMiddleware-->>CompanyRoute: Next()

    CompanyRoute->>PlanMiddleware: **PlanMiddleware**
    PlanMiddleware->>PlanMiddleware: Injeta planInfo (plan, status, maxEmployees, currentEmployees)
    PlanMiddleware-->>CompanyRoute: Next()

    CompanyRoute->>RequireEnterpriseAdmin: **RoleGuard**
    RequireEnterpriseAdmin->>RequireEnterpriseAdmin: role === ENTERPRISE_ADMIN || MASTER
    alt Falha
        RequireEnterpriseAdmin-->>Client: 403
    end
    RequireEnterpriseAdmin-->>CompanyRoute: Next()

    CompanyRoute->>RequireEmployeeLimit: **PlanMiddleware.requireEmployeeLimit**
    RequireEmployeeLimit->>RequireEmployeeLimit: planInfo = (req as any).planInfo
    RequireEmployeeLimit->>PlanLimits: getPlanLimits(planInfo.plan)
    PlanLimits-->>RequireEmployeeLimit: {maxEmployees}
    alt maxEmployees !== null && currentEmployees >= maxEmployees
        RequireEmployeeLimit-->>Client: 403 {message: "Limite de X funcionários atingido", code: "EMPLOYEE_LIMIT_REACHED"}
    end
    RequireEmployeeLimit-->>CompanyRoute: Next()

    CompanyRoute->>CompanyCtrl: Chama controller.createInvite(req, res)

    Note over CompanyCtrl: Valida role do usuário (dupla checagem)
    CompanyCtrl->>CompanyCtrl: if (userRole !== 'ENTERPRISE_ADMIN') return 403

    Note over CompanyCtrl: Busca empresa + contagem
    CompanyCtrl->>Prisma: company.findUnique({where: {id: companyId}, select: {plan, maxEmployees, _count: {users}}})
    Prisma->>DB: SELECT plan, maxEmployees, _count.users FROM Company WHERE id = ?
    DB-->>Prisma: Company
    Prisma-->>CompanyCtrl: Company

    Note over CompanyCtrl: Verifica limite (dupla checagem)
    CompanyCtrl->>PlanLimits: getPlanLimits(plan)
    alt Limite atingido
        CompanyCtrl-->>Client: 403 {code: "EMPLOYEE_LIMIT_REACHED"}
    end

    Note over CompanyCtrl: Validação Zod
    CompanyCtrl->>CompanyCtrl: bodySchema.parse(req.body) - email, role(ENTERPRISE_ADMIN|EMPLOYEE), message(opcional)
    alt Inválido
        CompanyCtrl-->>Client: 400
    end

    Note over CompanyCtrl: Verifica usuário existente
    CompanyCtrl->>Prisma: user.findUnique({where: {email}})
    alt Email já cadastrado
        CompanyCtrl-->>Client: 400 {message: "Usuário já cadastrado"}
    end

    Note over CompanyCtrl: Verifica convite pendente
    CompanyCtrl->>Prisma: inviteToken.findFirst({where: {email, companyId, usedAt: null, expiresAt: {gt: now}}})
    alt Convite pendente existe
        CompanyCtrl-->>Client: 400 {message: "Convite pendente para este email"}
    end

    Note over CompanyCtrl: Gera token seguro
    CompanyCtrl->>Crypto: randomBytes(32).toString('hex')
    Crypto-->>CompanyCtrl: token (64 chars hex)

    Note over CompanyCtrl: Cria convite (expira 7 dias)
    CompanyCtrl->>Prisma: inviteToken.create({email, companyId, role, token, expiresAt: +7 dias})
    Prisma->>DB: INSERT INTO InviteToken
    DB-->>Prisma: InviteToken
    Prisma-->>CompanyCtrl: Invite

    Note over CompanyCtrl: Monta inviteUrl
    CompanyCtrl->>CompanyCtrl: inviteUrl = `${FRONTEND_URL}/accept-invite/${token}`

    CompanyCtrl-->>Client: 201 {invite: {id, email, role, expiresAt, inviteUrl}}
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Autenticação + Plano** | authMiddleware + planMiddleware | `companyRoutes.use(authMiddleware).use(planMiddleware)` |
| **Role ENTERPRISE_ADMIN** | Apenas admin da empresa | `requireEnterpriseAdmin` |
| **Limite Funcionários** | Bloqueia se `currentEmployees >= maxEmployees` do plano | `requireEmployeeLimit` middleware + verificação no controller |
| **Validação Email/Role** | Email válido, role: ENTERPRISE_ADMIN ou EMPLOYEE (default) | `z.object({email: z.email(), role: z.enum([...]).default('EMPLOYEE')})` |
| **Usuário Não Existe** | Bloqueia se email já cadastrado no sistema | `user.findUnique({where: {email}})` |
| **Convite Único** | Bloqueia se já existe convite pendente (não usado, não expirado) | `inviteToken.findFirst({email, companyId, usedAt: null, expiresAt: {gt: now}})` |
| **Token Seguro** | `crypto.randomBytes(32).toString('hex')` - 64 chars hex | `crypto.randomBytes(32).toString('hex')` |
| **Expiração** | 7 dias (`addDays(new Date(), 7)`) | `expiresAt: addDays(new Date(), 7)` |
| **Invite URL** | Frontend URL + token para página de aceite | `${FRONTEND_URL}/accept-invite/${token}` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter**
4. **MetricsMiddleware**
5. **AuthMiddleware**
6. **PlanMiddleware** - injeta planInfo
6. **RequireEnterpriseAdmin** - RoleGuard
7. **RequireEmployeeLimit** - EmployeeLimit** - **PlanMiddleware.requireEmployeeLimit** (verifica limite ANTES do controller)
8. **Controller** - CompanyController.createInvite

## Dupla Verificação de Limite

```typescript
// 1. MIDDLEWARE (antes do controller)
export function requireEmployeeLimit(req, res, next) {
  const planInfo = (req as any).planInfo
  const limits = getPlanLimits(planInfo.plan)
  if (limits.maxEmployees !== null && planInfo.currentEmployees >= limits.maxEmployees) {
    return res.status(403).json({code: 'EMPLOYEE_LIMIT_REACHED'})
  }
  next()
}

// 2. CONTROLLER (dupla checagem)
const company = await prisma.company.findUnique({...})
const limits = getPlanLimits(company.plan)
if (limits.maxEmployees !== null && company._count.users >= limits.maxEmployees) {
  return res.status(403).json({code: 'EMPLOYEE_LIMIT_REACHED'})
}
```

## Observações Importantes

✅ **Proteção em Camadas**: Middleware + Controller = defesa em profundidade.

✅ **Token Criptograficamente Seguro**: `crypto.randomBytes(32)` = 256 bits entropy.

✅ **Expiração Curta**: 7 dias força ação rápida.

✅ **Convite Único**: Impede spam de convites para mesmo email.

✅ **Invite URL Pronta**: Frontend só precisa abrir o link.

⚠️ **Sem Rate Limit Específico**: Apenas global.

⚠️ **Mensagem Customizada**: Campo `message` opcional no body mas não usado no email (futuro).

## Response Exemplo

```json
{
  "invite": {
    "id": "uuid",
    "email": "joao@empresa.com",
    "role": "EMPLOYEE",
    "expiresAt": "2024-01-22T10:30:00.000Z",
    "inviteUrl": "https://viggo.com/accept-invite/a1b2c3d4e5f6..."
  }
}
```

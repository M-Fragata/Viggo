# Fluxo: Master - Listar Empresas - GET /master/companies

## Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client (Master)
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant MasterRoute as Master Routes
    participant AuthMiddleware as AuthMiddleware
    participant RequireMaster as RequireMaster (RoleGuard)
    participant MasterCtrl as MasterController.listCompanies
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: GET /master/companies?page=1&limit=20&status=TRIAL&plan=TIER_I&search=acme
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min
    RateLimit-->>Express: OK
    Express->>MasterRoute: Roteamento

    MasterRoute->>AuthMiddleware: **Autenticação**
    AuthMiddleware->>AuthMiddleware: jwt.verify + decodifica {id, role, companyId, planTier, isMaster}
    alt isMaster !== true
        AuthMiddleware-->>Client: 401 (token inválido ou não é master)
    end
    AuthMiddleware->>AuthMiddleware: req.user = {id, role: MASTER, companyId, planTier, isMaster: true}
    AuthMiddleware->>AuthMiddleware: setCurrentCompanyId(companyId) - **ignorado para master**
    AuthMiddleware-->>MasterRoute: Next()

    MasterRoute->>RequireMaster: **RoleGuard**
    RequireMaster->>RequireMaster: role === MASTER
    alt Falha
        RequireMaster-->>Client: 403 {message: "Acesso negado. Permissão insuficiente.", requiredRoles: ["MASTER"]}
    end
    RequireMaster-->>MasterRoute: Next()

    MasterRoute->>MasterCtrl: Chama controller.listCompanies(req, res)

    Note over MasterCtrl: Validação Query (Zod)
    MasterCtrl->>MasterCtrl: querySchema.parse(req.query) - page, limit, status, plan, search
    alt Inválido
        MasterCtrl-->>Client: 400 {message: "Parâmetros inválidos", errors}
    end

    Note over MasterCtrl: Monta where dinâmico
    MasterCtrl->>MasterCtrl: where = {}
    alt status informado
        MasterCtrl->>MasterCtrl: where.status = status
    end
    alt plan informado
        MasterCtrl->>MasterCtrl: where.plan = plan
    end
    alt search informado
        MasterCtrl->>MasterCtrl: where.OR = [{name: {contains: search, mode: 'insensitive'}}, {cnpj: {contains: search}}]
    end

    Note over MasterCtrl: Query paralela (dados + count)
    par Dados paginados
        MasterCtrl->>Prisma: company.findMany({where, skip, take, orderBy: {createdAt: 'desc'}, select: {id, name, cnpj, plan, status, planExpiresAt, maxEmployees, createdAt, _count: {users, checkIns}}})
        Prisma->>DB: SELECT ... FROM Company WHERE ... ORDER BY createdAt DESC LIMIT ? OFFSET ?
        DB-->>Prisma: Company[]
        Prisma-->>MasterCtrl: Company[]
    and Total
        MasterCtrl->>Prisma: company.count({where})
        Prisma->>DB: SELECT COUNT(*) FROM Company WHERE ...
        DB-->>Prisma: total
        Prisma-->>MasterCtrl: number
    end

    Note over MasterCtrl: Enriquece com campos derivados
    MasterCtrl->>MasterCtrl: companies.map(c => ({...c, employeesCount: c._count.users, checkinsCount: c._count.checkIns, employeeUsagePercent: c.maxEmployees ? round(c._count.users/c.maxEmployees*100) : 0}))

    MasterCtrl-->>Client: 200 {data: [...], pagination: {page, limit, total, totalPages}}
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Apenas MASTER** | `requireMaster` garante role === MASTER | `requireMaster = requireRole(UserRole.MASTER)` |
| **Filtros** | status (TRIAL/ACTIVE/SUSPENDED/CANCELLED), plan (TIER_I/II/III/CUSTOM), search (name/cnpj) | `querySchema` com enums |
| **Busca Insensível** | `mode: 'insensitive'` no name | `name: {contains: search, mode: 'insensitive'}` |
| **Paginação** | page (default 1), limit (default 20, max 100) | `skip: (page-1)*limit, take: limit` |
| **Ordenação** | Mais recentes primeiro | `orderBy: {createdAt: 'desc'}` |
| **Contadores** | `_count: {users, checkIns}` para employeesCount, checkinsCount | `select: {_count: {select: {users: true, checkIns: true}}}` |
| **Campos Derivados** | employeeUsagePercent = round(users/maxEmployees*100) | Controller calcula |
| **Paginação Response** | page, limit, total, totalPages | `Math.ceil(total/limit)` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter**
4. **AuthMiddleware** - **Verifica isMaster no JWT**
5. **RequireMaster** - **RoleGuard: role === MASTER**
6. **Controller** - MasterController.listCompanies

## RoleGuard - RequireMaster

```typescript
export const requireMaster = requireRole(UserRole.MASTER)

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role as UserRole
    if (!userRole) return 401
    if (!allowedRoles.includes(userRole)) return 403
    next()
  }
}
```

- **Apenas MASTER**: O token deve ter `isMaster: true` e `role: "MASTER"`.

## Observações Importantes

✅ **Acesso Global**: MASTER vê TODAS empresas (sem filtro de companyId).

✅ **Filtros Poderosos**: Status, plano, busca textual.

✅ **Paginação Completa**: Controle total de paginação.

✅ **Métricas Enriquecidas**: employeesCount, checkinsCount, usage percent.

⚠️ **Sem Rate Limit Específico**: Apenas global.

⚠️ **Dados Sensíveis**: Retorna CNPJ, planExpiresAt - apenas para MASTER.

## Response Exemplo

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Ltda",
      "cnpj": "12.345.678/0001-90",
      "plan": "TIER_I",
      "status": "TRIAL",
      "planExpiresAt": "2024-02-15T00:00:00.000Z",
      "maxEmployees": 10,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "employeesCount": 3,
      "checkinsCount": 45,
      "employeeUsagePercent": 30
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

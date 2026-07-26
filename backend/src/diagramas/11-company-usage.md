# Fluxo: Uso da Empresa (Limites) - GET /companies/me/usage

## Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant CompanyRoute as Company Routes
    participant AuthMiddleware as AuthMiddleware
    participant PlanMiddleware as PlanMiddleware
    participant CompanyCtrl as CompanyController.getUsage
    participant Prisma as Prisma Client
    participant DB as PostgreSQL
    participant PlanLimits as planLimits.ts

    Client->>Express: GET /companies/me/usage
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min
    RateLimit-->>Express: OK
    Express->>CompanyRoute: Roteamento

    CompanyRoute->>AuthMiddleware: **Autenticação**
    AuthMiddleware->>AuthMiddleware: jwt.verify + setCurrentCompanyId
    AuthMiddleware-->>CompanyRoute: Next()

    CompanyRoute->>PlanMiddleware: **PlanMiddleware (injeta planInfo)**
    PlanMiddleware->>PlanMiddleware: Busca empresa + _count.users
    PlanMiddleware->>PlanMiddleware: Calcula trialDaysRemaining, isTrial
    PlanMiddleware-->>CompanyRoute: Next()

    CompanyRoute->>CompanyCtrl: Chama controller.getUsage(req, res)

    Note over CompanyCtrl: Busca empresa + contadores
    CompanyCtrl->>Prisma: company.findUnique({where: {id: companyId}, select: {plan, maxEmployees, _count: {users, checkIns}}})
    Prisma->>DB: SELECT plan, maxEmployees, _count.users, _count.checkIns FROM Company WHERE id = ?
    DB-->>Prisma: Company
    Prisma-->>CompanyCtrl: Company

    Note over CompanyCtrl: Limites do plano
    CompanyCtrl->>PlanLimits: getPlanLimits(company.plan)
    PlanLimits-->>CompanyCtrl: {maxEmployees, price, api: {general, checkin, faceValidation}}

    Note over CompanyCtrl: Check-ins mês atual
    CompanyCtrl->>CompanyCtrl: startOfMonth/endOfMonth (date-fns)
    CompanyCtrl->>Prisma: checkIn.count({where: {companyId, createdAt: {gte: inicioMes, lte: fimMes}}})
    Prisma->>DB: SELECT COUNT(*) FROM CheckIn WHERE companyId = ? AND createdAt BETWEEN ? AND ?
    DB-->>Prisma: count
    Prisma-->>CompanyCtrl: checkinsThisMonth

    CompanyCtrl->>CompanyCtrl: Monta response com employees, checkins, apiLimits, plan

    CompanyCtrl-->>Client: 200 {
    employees: {current, limit, percentage},
    checkins: {thisMonth, total},
    apiLimits: {general, checkin, faceValidation},
    plan: "TIER_I"
    }
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Autenticação + Plano** | authMiddleware + planMiddleware | `companyRoutes.use(authMiddleware).use(planMiddleware)` |
| **Empresa do Token** | `companyId` do JWT | `req.user.companyId` |
| **Contadores** | `_count: {users, checkIns}` - usuários totais + check-ins totais | `select: {_count: {select: {users: true, checkIns: true}}}` |
| **Limites do Plano** | `getPlanLimits(plan)` - maxEmployees, api limits | `planLimits.ts` |
| **Check-ins Mês** | `startOfMonth`/`endOfMonth` + count com companyId | `checkIn.count({where: {companyId, createdAt: {gte: inicioMes, lte: fimMes}}})` |
| **Percentual Uso** | `(current / limit) * 100` | `Math.round((current / limit) * 100)` |
| **API Limits** | Retorna limites por tipo (general, checkin, faceValidation) | `limits.api` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter**
4. **AuthMiddleware**
5. **PlanMiddleware**
6. **Controller** - CompanyController.getUsage

## Observações Importantes

✅ **Visão Completa**: Retorna uso de funcionários, check-ins e API limits em uma chamada.

✅ **Mês Atual**: Calcula check-ins do mês corrente para billing/usage.

✅ **API Limits por Plano**: Útil para frontend mostrar rate limits restantes.

⚠️ **Dupla Busca**: PlanMiddleware já buscou empresa, Controller busca de novo.

⚠️ **Sem Rate Limit Específico**: Apenas global.

## Response Exemplo

```json
{
  "employees": {
    "current": 3,
    "limit": 10,
    "percentage": 30
  },
  "checkins": {
    "thisMonth": 45,
    "total": 120
  },
  "apiLimits": {
    "general": 100,
    "checkin": 10,
    "faceValidation": 30
  },
  "plan": "TIER_I"
}
```

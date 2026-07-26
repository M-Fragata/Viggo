# Fluxo: Master - Métricas Globais - GET /master/metrics

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
    participant RequireMaster as RequireMaster
    participant MasterCtrl as MasterController.getMetrics
    participant Prisma as Prisma Client
    participant DB as PostgreSQL
    participant PlanLimits as planLimits.ts
    participant DateFns as date-fns

    Client->>Express: GET /master/metrics
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min
    RateLimit-->>Express: OK
    Express->>MasterRoute: Roteamento

    MasterRoute->>AuthMiddleware: **Autenticação (isMaster)**
    AuthMiddleware->>AuthMiddleware: jwt.verify -> req.user = {role: MASTER, isMaster: true}
    AuthMiddleware-->>MasterRoute: Next()

    MasterRoute->>RequireMaster: **RoleGuard (MASTER)**
    RequireMaster->>RequireMaster: role === MASTER
    alt Falha
        RequireMaster-->>Client: 403
    end
    RequireMaster-->>MasterRoute: Next()

    MasterRoute->>MasterCtrl: Chama controller.getMetrics(req, res)

    Note over MasterCtrl: Cálculos de data
    MasterCtrl->>DateFns: startOfMonth(now), startOfMonth(subMonths(now,1)), endOfMonth(subMonths(now,1))

    Note over MasterCtrl: Queries paralelas (Promise.all)
    par Contadores Empresas
        MasterCtrl->>Prisma: company.count()
        MasterCtrl->>Prisma: company.count({where: {status: ACTIVE}})
        MasterCtrl->>Prisma: company.count({where: {status: TRIAL}})
        MasterCtrl->>Prisma: company.count({where: {status: SUSPENDED}})
        MasterCtrl->>Prisma: company.count({where: {status: CANCELLED}})
    and Distribuição Planos
        MasterCtrl->>Prisma: company.groupBy({by: ['plan'], _count: {plan: true}})
    and Contadores Gerais
        MasterCtrl->>Prisma: user.count()
    and Check-ins Mês Atual
        MasterCtrl->>Prisma: checkIn.count({where: {createdAt: {gte: startOfThisMonth}}})
    and Check-ins Mês Anterior
        MasterCtrl->>Prisma: checkIn.count({where: {createdAt: {gte: startOfLastMonth, lte: endOfLastMonth}}})
    end

    Note over MasterCtrl: Processa resultados
    MasterCtrl->>MasterCtrl: planDist = groupBy.reduce((acc, p) => {acc[p.plan] = p._count.plan; return acc}, {})
    MasterCtrl->>PlanLimits: getPlanLimits(plan) para cada plano
    PlanLimits-->>MasterCtrl: {price}
    MasterCtrl->>MasterCtrl: mrr = Σ(price * count) por plano
    MasterCtrl->>MasterCtrl: churnRate = totalCompanies > 0 ? round(cancelled/total*100) : 0
    MasterCtrl->>MasterCtrl: growthRate = checkinsLastMonth > 0 ? round((thisMonth-lastMonth)/lastMonth*100) : 0

    MasterCtrl-->>Client: 200 {
      companies: {total, active, trial, suspended, cancelled},
      users: {total},
      checkins: {thisMonth, lastMonth, growthRate},
      revenue: {mrr, planDistribution},
      churn: {rate, cancelled}
    }
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Apenas MASTER** | requireMaster | `requireMaster` |
| **Períodos** | Mês atual vs mês anterior (date-fns) | `startOfMonth`, `subMonths`, `endOfMonth` |
| **Queries Paralelas** | Promise.all para performance | `await Promise.all([...])` |
| **Contadores por Status** | TRIAL, ACTIVE, SUSPENDED, CANCELLED | `company.count({where: {status}})` |
| **Distribuição Planos** | `groupBy({by: ['plan'], _count: {plan: true}})` | `company.groupBy({by: ['plan']})` |
| **MRR Calculation** | Σ(price_do_plano * qtd_empresas_no_plano) | `reduce((sum, [plan, count]) => sum + price * count)` |
| **Churn Rate** | (cancelled / total) * 100 | `round(cancelled / total * 100)` |
| **Growth Rate Check-ins** | (thisMonth - lastMonth) / lastMonth * 100 | `round((this - last) / last * 100)` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter**
4. **AuthMiddleware**
5. **RequireMaster**
6. **Controller** - MasterController.getMetrics

## Cálculos Derivados

```typescript
// MRR (Monthly Recurring Revenue)
const mrr = Object.entries(planDist).reduce((sum, [plan, count]) => {
  const limits = getPlanLimits(plan as PlanTier)
  return sum + (limits.price ?? 0) * count
}, 0)

// Churn Rate
const churnRate = totalCompanies > 0 
  ? Math.round((cancelledCompanies / totalCompanies) * 100) 
  : 0

// Growth Rate (Check-ins)
const growthRate = checkinsLastMonth > 0
  ? Math.round(((checkinsThisMonth - checkinsLastMonth) / checkinsLastMonth) * 100)
  : 0
```

## Observações Importantes

✅ **Performance**: Promise.all executa todas queries em paralelo.

✅ **MRR Real**: Usa preços reais dos planos (planLimits.ts).

✅ **Métricas Chave**: MRR, Churn, Growth - essenciais para SaaS.

✅ **Distribuição Planos**: Mostra quantas empresas em cada tier.

⚠️ **Sem Cache**: Recalcula a cada request (pode ser pesado em escala).

⚠️ **Apenas MASTER**: Dados sensíveis de negócio.

## Response Exemplo

```json
{
  "companies": {
    "total": 47,
    "active": 42,
    "trial": 3,
    "suspended": 2,
    "cancelled": 0
  },
  "users": {"total": 234},
  "checkins": {
    "thisMonth": 1250,
    "lastMonth": 1100,
    "growthRate": 13
  },
  "revenue": {
    "mrr": 7840.50,
    "planDistribution": {"TIER_I": 30, "TIER_II": 12, "TIER_III": 5, "ENTERPRISE_CUSTOM": 0}
  },
  "churn": {"rate": 0, "cancelled": 0}
}
```

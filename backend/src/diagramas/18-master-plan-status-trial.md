# Fluxos Master: Override Plano, Status e Estender Trial

---

## 1. Override Plano - PUT /master/companies/:id/plan

### Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client (Master)
    participant Express as Express App
    participant Middlewares as Middlewares (CORS, Logger, RateLimit, Metrics, Auth, RequireMaster)
    participant MasterCtrl as MasterController.updateCompanyPlan
    participant Prisma as Prisma Client
    participant DB as PostgreSQL
    participant PlanLimits as planLimits.ts

    Client->>Express: PUT /master/companies/:id/plan {plan: "TIER_II", maxEmployees?: 50}
    Express->>Middlewares: CORS, Logger, RateLimit, Metrics, Auth(MASTER), RequireMaster
    Middlewares-->>MasterCtrl: Next()

    MasterCtrl->>MasterCtrl: Valida params (id: uuid) + body (plan: enum, maxEmployees?: number)
    alt Inválido
        MasterCtrl-->>Client: 400
    end

    MasterCtrl->>Prisma: company.findUnique({where: {id}})
    Prisma->>DB: SELECT * FROM Company WHERE id = ?
    DB-->>Prisma: Company
    alt Não encontrada
        MasterCtrl-->>Client: 404
    end

    MasterCtrl->>PlanLimits: getPlanLimits(plan)
    PlanLimits-->>MasterCtrl: {maxEmployees, price}

    MasterCtrl->>MasterCtrl: finalMaxEmployees = maxEmployees ?? limits.maxEmployees ?? company.maxEmployees

    MasterCtrl->>Prisma: company.update({where: {id}, data: {plan, maxEmployees: finalMaxEmployees, status: ACTIVE, planExpiresAt: null}})
    Prisma->>DB: UPDATE Company SET plan=?, maxEmployees=?, status=ACTIVE, planExpiresAt=NULL WHERE id=?
    DB-->>Prisma: Company atualizada

    MasterCtrl->>Prisma: subscription.create({companyId: id, planTier: plan, price: limits.price, status: ACTIVE, startedAt: now()})
    Prisma->>DB: INSERT INTO Subscription (histórico de mudança)
    DB-->>Prisma: Subscription

    MasterCtrl-->>Client: 200 {id, name, plan, status, maxEmployees}
```

### Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| **Apenas MASTER** | requireMaster |
| **Validação** | plan: enum TIER_I/II/III/ENTERPRISE_CUSTOM; maxEmployees opcional (min 1) |
| **Empresa Existe** | findUnique |
| **Limites do Plano** | getPlanLimits(plan) retorna maxEmployees e price padrão |
| **MaxEmployees Final** | body.maxEmployees ?? limits.maxEmployees ?? company.maxEmployees (fallback) |
| **Ativação Automática** | status = ACTIVE, planExpiresAt = null (remove trial) |
| **Histórico** | Cria Subscription com novo plano, price, status ACTIVE |
| **Override Total** | MASTER pode colocar qualquer plano/limite |

---

## 2. Override Status - PUT /master/companies/:id/status

### Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client (Master)
    participant Express as Express App
    participant Middlewares as Middlewares
    participant MasterCtrl as MasterController.updateCompanyStatus
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: PUT /master/companies/:id/status {status: "SUSPENDED"}
    Express->>Middlewares: CORS, Logger, RateLimit, Metrics, Auth(MASTER), RequireMaster
    Middlewares-->>MasterCtrl: Next()

    MasterCtrl->>MasterCtrl: Valida params (id: uuid) + body (status: enum ACTIVE/SUSPENDED/CANCELLED)
    alt Inválido
        MasterCtrl-->>Client: 400
    end

    MasterCtrl->>Prisma: company.findUnique({where: {id}})
    alt Não encontrada
        MasterCtrl-->>Client: 404
    end

    MasterCtrl->>Prisma: company.update({where: {id}, data: {status}})
    Prisma->>DB: UPDATE Company SET status = ? WHERE id = ?
    DB-->>Prisma: Company

    MasterCtrl-->>Client: 200 {id, name, status}
```

### Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| **Apenas MASTER** | requireMaster |
| **Status Válidos** | ACTIVE, SUSPENDED, CANCELLED (TRIAL não permitido - use extend-trial) |
| **Efeito SUSPENDED** | PlanMiddleware.requireActivePlan bloqueia check-ins |
| **Efeito CANCELLED** | PlanMiddleware.requireActivePlan bloqueia tudo |
| **Sem Histórico** | Não cria Subscription (apenas override plano cria) |

---

## 3. Estender Trial - POST /master/companies/:id/extend-trial

### Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client (Master)
    participant Express as Express App
    participant Middlewares as Middlewares
    participant MasterCtrl as MasterController.extendTrial
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: POST /master/companies/:id/extend-trial {days: 15}
    Express->>Middlewares: CORS, Logger, RateLimit, Metrics, Auth(MASTER), RequireMaster
    Middlewares-->>MasterCtrl: Next()

    MasterCtrl->>MasterCtrl: Valida params (id: uuid) + body (days: number 1-90, default 30)
    alt Inválido
        MasterCtrl-->>Client: 400
    end

    MasterCtrl->>Prisma: company.findUnique({where: {id}})
    alt Não encontrada
        MasterCtrl-->>Client: 404
    end

    MasterCtrl->>MasterCtrl: newExpiresAt = company.planExpiresAt ? planExpiresAt + days : now() + days

    MasterCtrl->>Prisma: company.update({where: {id}, data: {planExpiresAt: newExpiresAt}})
    Prisma->>DB: UPDATE Company SET planExpiresAt = ? WHERE id = ?
    DB-->>Prisma: Company

    MasterCtrl-->>Client: 200 {id, name, planExpiresAt}
```

### Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| **Apenas MASTER** | requireMaster |
| **Dias** | 1-90 (default 30) |
| **Cálculo** | Se tem planExpiresAt: soma dias; senão: now() + dias |
| **Não Altera Status** | Mantém status atual (TRIAL/ACTIVE/etc) |
| **Não Altera Plano** | Mantém plan e maxEmployees atuais |
| **Uso Comum** | Dar mais tempo para testes, cortesia, recuperação |

---

## Middlewares Comuns (Todos)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter** (100 req/min)
4. **MetricsMiddleware**
5. **AuthMiddleware** (verifica isMaster)
6. **RequireMaster** (RoleGuard)
7. **Controller**

## Observações Importantes

✅ **Poder Total**: MASTER pode fazer override de qualquer regra de negócio.

✅ **Auditoria Implícita**: Mudanças de plano criam Subscription (histórico).

✅ **Flexibilidade**: Útil para suporte, cortesia, recuperação de contas.

⚠️ **Poder Perigoso**: MASTER pode burlar limites, criar planos customizados.

⚠️ **Sem Auditoria Explícita**: Não usa auditMiddleware (pode adicionar).

⚠️ **Sem Notificação**: Não avisa empresa da mudança (email/push futuro).

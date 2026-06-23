# Fluxo: Listar e Cancelar Convites - GET/DELETE /companies/me/invites

## Diagrama de Sequência - LISTAR (GET /companies/me/invites)

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
    participant CompanyCtrl as CompanyController.listInvites
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: GET /companies/me/invites
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
    PlanMiddleware-->>CompanyRoute: Next()

    CompanyRoute->>RequireEnterpriseAdmin: **RoleGuard**
    RequireEnterpriseAdmin->>RequireEnterpriseAdmin: role === ENTERPRISE_ADMIN || MASTER
    alt Falha
        RequireEnterpriseAdmin-->>Client: 403
    end
    RequireEnterpriseAdmin-->>CompanyRoute: Next()

    CompanyRoute->>CompanyCtrl: Chama controller.listInvites(req, res)

    Note over CompanyCtrl: Busca convites da empresa
    CompanyCtrl->>Prisma: inviteToken.findMany({where: {companyId}, orderBy: {createdAt: 'desc'}, select: {id, email, role, expiresAt, usedAt, createdAt}})
    Prisma->>DB: SELECT id, email, role, expiresAt, usedAt, createdAt FROM InviteToken WHERE companyId = ? ORDER BY createdAt DESC
    DB-->>Prisma: InviteToken[]
    Prisma-->>CompanyCtrl: InviteToken[]

    CompanyCtrl-->>Client: 200 [{id, email, role, expiresAt, usedAt, createdAt}, ...]
```

## Diagrama de Sequência - CANCELAR (DELETE /companies/me/invites/:id)

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
    participant CompanyCtrl as CompanyController.cancelInvite
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: DELETE /companies/me/invites/:id
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
    PlanMiddleware-->>CompanyRoute: Next()

    CompanyRoute->>RequireEnterpriseAdmin: **RoleGuard**
    RequireEnterpriseAdmin->>RequireEnterpriseAdmin: role === ENTERPRISE_ADMIN || MASTER
    alt Falha
        RequireEnterpriseAdmin-->>Client: 403
    end
    RequireEnterpriseAdmin-->>CompanyRoute: Next()

    CompanyRoute->>CompanyCtrl: Chama controller.cancelInvite(req, res)

    Note over CompanyCtrl: Valida UUID
    CompanyCtrl->>CompanyCtrl: paramsSchema.parse(req.params) - id: z.uuid()
    alt UUID inválido
        CompanyCtrl-->>Client: 400
    end

    Note over CompanyCtrl: Busca convite da empresa
    CompanyCtrl->>Prisma: inviteToken.findFirst({where: {id, companyId}})
    Prisma->>DB: SELECT * FROM InviteToken WHERE id = ? AND companyId = ?
    DB-->>Prisma: InviteToken (ou null)
    alt Não encontrado
        CompanyCtrl-->>Client: 404 {message: "Convite não encontrado"}
    end

    Note over CompanyCtrl: Verifica se já usado
    CompanyCtrl->>CompanyCtrl: if (invite.usedAt) return 400
    alt Já usado
        CompanyCtrl-->>Client: 400 {message: "Convite já foi usado"}
    end

    Note over CompanyCtrl: Deleta convite
    CompanyCtrl->>Prisma: inviteToken.delete({where: {id}})
    Prisma->>DB: DELETE FROM InviteToken WHERE id = ?
    DB-->>Prisma: OK
    Prisma-->>CompanyCtrl: OK

    CompanyCtrl-->>Client: 200 {message: "Convite cancelado"}
```

## Regras de Negócio (Listar)

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Autenticação + Role** | auth + plan + requireEnterpriseAdmin | Middlewares em cadeia |
| **Filtro por Empresa** | Apenas convites da empresa logada | `where: {companyId}` |
| **Ordenação** | Mais recentes primeiro | `orderBy: {createdAt: 'desc'}` |
| **Campos Retornados** | id, email, role, expiresAt, usedAt, createdAt | `select: {...}` |

## Regras de Negócio (Cancelar)

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Validação UUID** | `id` deve ser UUID válido | `z.uuid()` |
| **Pertence à Empresa** | `where: {id, companyId}` - impede acesso cross-tenant | `findFirst({where: {id, companyId}})` |
| **Não Usado** | Só cancela se `usedAt === null` | `if (invite.usedAt) return 400` |
| **Soft Delete** | Hard delete (DELETE) - convite cancelado desaparece | `inviteToken.delete({where: {id}})` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter**
4. **MetricsMiddleware**
5. **AuthMiddleware**
6. **PlanMiddleware**
7. **RequireEnterpriseAdmin**
8. **Controller** - listInvites / cancelInvite

## Observações Importantes

✅ **Isolamento Total**: `where: {id, companyId}` impede que admin de empresa A cancele convite de empresa B.

✅ **Apenas Pendentes**: Não permite cancelar convite já usado (`usedAt !== null`).

✅ **Ordenação Útil**: Mais recentes primeiro facilita gestão.

⚠️ **Hard Delete**: Convite cancelado é removido permanentemente (não soft delete).

⚠️ **Sem Auditoria**: DELETE não é auditado (auditMiddleware só pega checkins).

## Response Exemplo (Listar)

```json
[
  {
    "id": "uuid-1",
    "email": "joao@empresa.com",
    "role": "EMPLOYEE",
    "expiresAt": "2024-01-22T10:30:00.000Z",
    "usedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "uuid-2",
    "email": "maria@empresa.com",
    "role": "ENTERPRISE_ADMIN",
    "expiresAt": "2024-01-20T15:00:00.000Z",
    "usedAt": "2024-01-18T09:15:00.000Z",
    "createdAt": "2024-01-13T14:20:00.000Z"
  }
]
```

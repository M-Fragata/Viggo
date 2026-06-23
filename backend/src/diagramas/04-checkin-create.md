# Fluxo: Criar Check-in (Bater Ponto) - POST /checkins

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
    participant CheckinRoute as Checkin Routes
    participant AuthMiddleware as AuthMiddleware
    participant CheckinLimiter as CheckinLimiter (10/hora)
    participant AuditMiddleware as AuditMiddleware
    participant CheckinCtrl as CheckinController.createCheckin
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: POST /checkins {type, latitude, longitude}
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min por userId/IP
    RateLimit-->>Express: OK
    Express->>Metrics: Coleta métricas
    Metrics-->>Express: Next
    Express->>CheckinRoute: Roteamento

    CheckinRoute->>AuthMiddleware: **Autenticação Obrigatória**
    AuthMiddleware->>AuthMiddleware: Extrai Bearer token do header
    alt Token ausente/inválido
        AuthMiddleware-->>Client: 401 {message: "Token não fornecido" / "Token inválido"}
    end
    AuthMiddleware->>AuthMiddleware: jwt.verify(token, JWT_SECRET)
    AuthMiddleware->>AuthMiddleware: Decodifica {id, role, companyId, planTier, isMaster}
    AuthMiddleware->>AuthMiddleware: req.user = {id, role, companyId, planTier, isMaster}
    AuthMiddleware->>AuthMiddleware: setCurrentCompanyId(companyId) - **Contexto Prisma Multi-tenancy**
    AuthMiddleware->>AuthMiddleware: setCurrentUserId(id)
    AuthMiddleware-->>CheckinRoute: Next()

    CheckinRoute->>CheckinLimiter: **Rate Limit Específico**
    CheckinLimiter->>CheckinLimiter: Key: req.user.id | Max: 10 | Window: 1 hora
    alt Limite excedido
        CheckinLimiter-->>Client: 429 {message: "Limite de batidas de ponto excedido. Tente novamente em 1 hora."}
    end
    CheckinLimiter-->>CheckinRoute: Next()

    CheckinRoute->>AuditMiddleware: **Auditoria**
    AuditMiddleware->>AuditMiddleware: Intercepta res.json
    AuditMiddleware-->>CheckinRoute: Next()

    CheckinRoute->>CheckinCtrl: Chama controller.createCheckin(req, res)

    Note over CheckinCtrl: Validação Body (Zod)
    CheckinCtrl->>CheckinCtrl: bodySchema.parse(req.body)
    alt Dados inválidos
        CheckinCtrl-->>Client: 400 {message: "Invalid request body", errors}
    end

    CheckinCtrl->>Prisma: user.findUnique({where: {id: req.user.id}})
    Prisma->>DB: SELECT * FROM User WHERE id = ? **COM companyId do contexto**
    DB-->>Prisma: User (com faceDescriptor)
    alt Usuário não encontrado
        CheckinCtrl-->>Client: 404 {message: "User not found"}
    end

    Note over CheckinCtrl: Verifica duplicidade no dia
    CheckinCtrl->>Prisma: checkIn.findFirst({where: {userId, type, createdAt: hoje}})
    Prisma->>DB: SELECT * FROM CheckIn WHERE userId=? AND type=? AND createdAt BETWEEN inicio_dia AND fim_dia
    DB-->>Prisma: CheckIn (ou null)
    alt Check-in já existe hoje
        CheckinCtrl-->>Client: 400 {message: "Ponto de TYPE já registrado hoje."}
    end

    CheckinCtrl->>Prisma: checkIn.create({type, latitude, longitude, userId, companyId: user.companyId})
    Prisma->>DB: INSERT INTO CheckIn ... **companyId vem do user.companyId**
    DB-->>Prisma: CheckIn criado
    Prisma-->>CheckinCtrl: CheckIn

    CheckinCtrl-->>Client: 201 {checkin, faceDescriptor: user.faceDescriptor}

    Note over AuditMiddleware: Pós-resposta (res.json interceptado)
    AuditMiddleware->>AuditMiddleware: getActionFromRequest -> "CHECKIN"
    AuditMiddleware->>AuditMiddleware: getEntityFromRequest -> "CheckIn"
    AuditMiddleware->>Prisma: auditLog.create({userId, companyId, action, entity, entityId, ip, userAgent})
    Prisma->>DB: INSERT INTO AuditLog ...
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Autenticação Obrigatória** | JWT válido com `companyId` | `authMiddleware` |
| **Validação Tipo** | ENUM: ENTRY, LUNCH_START, LUNCH_END, EXIT | `z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"])` |
| **Coordenadas Obrigatórias** | latitude/longitude numbers | `z.number()` |
| **Um por dia por tipo** | Não pode registrar mesmo tipo duas vezes no dia | `checkIn.findFirst({userId, type, createdAt: hoje})` |
| **Empresa do Usuário** | `companyId` vem do `user.companyId` (contexto multi-tenancy) | `companyId: user.companyId` |
| **Face Descriptor** | Retorna no response para validação facial frontend | `faceDescriptor: user.faceDescriptor` |
| **Rate Limit** | 10 check-ins por hora por usuário | `checkinLimiter` (key: user.id) |
| **Auditoria** | Log automático em AuditLog | `auditMiddleware` intercepta res.json |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter** - 100 req/min
4. **MetricsMiddleware**
5. **AuthMiddleware** - **JWT verify + setCurrentCompanyId + setCurrentUserId**
6. **CheckinLimiter** - 10 req/hora por userId
7. **AuditMiddleware** - Intercepta response para log
8. **Controller** - CheckinController.createCheckin

## Contexto Multi-Tenancy (Crítico)

```
AuthMiddleware.setCurrentCompanyId(companyId)
    ↓
Prisma Extension ($allModels.$allOperations)
    ↓
Adiciona automaticamente `companyId` em:
  - WHERE clauses (findUnique, findMany, etc.)
  - DATA clauses (create, update, etc.)
```

Isso garante **isolamento total** - usuário da empresa A **nunca** vê dados da empresa B.

## Observações Importantes

✅ **Rate Limit por Usuário**: `keyGenerator: req.user?.id ?? req.ip` - mais seguro que IP.

✅ **Multi-Tenancy Automático**: Prisma Extension injeta `companyId` em todas as queries.

✅ **Auditoria Pós-operatório**: `AuditMiddleware` intercepta `res.json` para logar após sucesso (200/201).

⚠️ **Sem validação de plano**: Não verifica `PlanMiddleware` (trial expirado, limite funcionários).

⚠️ **Face Descriptor exposto**: Retorna no response - necessário para frontend validar, mas sensível.
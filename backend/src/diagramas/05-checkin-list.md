# Fluxo: Listar Check-ins do Usuário - GET /checkins

## Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant CheckinRoute as Checkin Routes
    participant AuthMiddleware as AuthMiddleware
    participant CheckinCtrl as CheckinController.index
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: GET /checkins?date=2024-01-15
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min por userId/IP
    RateLimit-->>Express: OK
    Express->>CheckinRoute: Roteamento

    CheckinRoute->>AuthMiddleware: **Autenticação Obrigatória**
    AuthMiddleware->>AuthMiddleware: Extrai Bearer token
    alt Token ausente/inválido
        AuthMiddleware-->>Client: 401 {message: "Token não fornecido" / "Token inválido"}
    end
    AuthMiddleware->>AuthMiddleware: jwt.verify + decodifica {id, role, companyId, planTier, isMaster}
    AuthMiddleware->>AuthMiddleware: req.user = {id, role, companyId, planTier, isMaster}
    AuthMiddleware->>AuthMiddleware: setCurrentCompanyId(companyId)
    AuthMiddleware->>AuthMiddleware: setCurrentUserId(id)
    AuthMiddleware-->>CheckinRoute: Next()

    CheckinRoute->>CheckinCtrl: Chama controller.index(req, res)

    Note over CheckinCtrl: Validação Query (Zod)
    CheckinCtrl->>CheckinCtrl: paramsSchema.parse(req.query) - date opcional (ISO string)
    alt Date inválida
        CheckinCtrl-->>Client: 400 {message: "Invalid request body", errors}
    end

    CheckinCtrl->>Prisma: user.findUnique({where: {id: req.user.id}})
    Prisma->>DB: SELECT * FROM User WHERE id = ? **COM companyId do contexto**
    DB-->>Prisma: User
    alt Usuário não encontrado
        CheckinCtrl-->>Client: 404 {message: "User not found"}
    end

    Note over CheckinCtrl: Parse data (hoje se não informada)
    CheckinCtrl->>CheckinCtrl: date || new Date().toISOString() -> parseISO -> startOfDay/endOfDay

    CheckinCtrl->>Prisma: checkIn.findMany({where: {userId, createdAt: {gte: inicio, lte: fim}}})
    Prisma->>DB: SELECT * FROM CheckIn WHERE userId=? AND createdAt BETWEEN ? AND ? **companyId no contexto**
    DB-->>Prisma: CheckIn[]
    Prisma-->>CheckinCtrl: CheckIn[]

    CheckinCtrl-->>Client: 200 [CheckIn, CheckIn, ...]
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Autenticação Obrigatória** | JWT válido | `authMiddleware` |
| **Data Opcional** | Default: hoje (`new Date().toISOString()`) | `date: z.string().optional()` |
| **Parse de Data** | `parseISO` + `startOfDay`/`endOfDay` (date-fns) | `gte: startOfDay(parsedDate), lte: endOfDay(parsedDate)` |
| **Filtro por Usuário** | Apenas check-ins do usuário logado | `where: {userId: req.user.id}` |
| **Isolamento Multi-Tenancy** | Prisma Extension injeta `companyId` automaticamente | `setCurrentCompanyId(companyId)` no AuthMiddleware |
| **Ordenação** | Padrão do banco (createdAt ASC) - sem orderBy explícito | `findMany` sem orderBy |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter** - 100 req/min
4. **AuthMiddleware** - JWT verify + contexto multi-tenancy
5. **Controller** - CheckinController.index

## Observações Importantes

✅ **Rate Limit**: Usa `generalApiLimiter` (100 req/min), não tem limiter específico.

✅ **Sem Auditoria**: GET não é auditado (auditMiddleware só loga POST/PUT/DELETE com 200/201).

✅ **Isolamento Total**: `setCurrentCompanyId` + Prisma Extension garante que usuário só vê seus check-ins.

⚠️ **Sem Paginação**: Retorna todos os check-ins do dia - pode ser problema se muitos registros.

⚠️ **Sem Filtro por Tipo**: Não permite filtrar por tipo de check-in (ENTRY, EXIT, etc.).

## Diferenças do POST /checkins

| Aspecto | POST /checkins | GET /checkins |
|---------|----------------|---------------|
| **Rate Limit** | `checkinLimiter` (10/hora) | `generalApiLimiter` (100/min) |
| **Auditoria** | Sim (`auditMiddleware`) | Não |
| **Validação** | Body (type, lat, long) | Query (date opcional) |
| **Duplicidade** | Verifica se já existe | Não aplica |
| **Face Descriptor** | Retorna no response | Não retorna |
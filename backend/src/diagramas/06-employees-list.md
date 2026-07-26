# Fluxo: Listar Funcionários com Check-ins do Dia - GET /employees

## Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant EmployeesRoute as Employees Routes
    participant AuthMiddleware as AuthMiddleware
    participant FaceValidationLimiter as FaceValidationLimiter (NÃO aplicado aqui)
    participant EmployeesCtrl as EmployeesController.getEmployees
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: GET /employees?date=2024-01-15
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min por userId/IP
    RateLimit-->>Express: OK
    Express->>EmployeesRoute: Roteamento

    EmployeesRoute->>AuthMiddleware: **Autenticação Obrigatória**
    AuthMiddleware->>AuthMiddleware: Extrai Bearer token + jwt.verify
    alt Token inválido
        AuthMiddleware-->>Client: 401
    end
    AuthMiddleware->>AuthMiddleware: req.user = {id, role, companyId, planTier, isMaster}
    AuthMiddleware->>AuthMiddleware: setCurrentCompanyId(companyId)
    AuthMiddleware->>AuthMiddleware: setCurrentUserId(id)
    AuthMiddleware-->>EmployeesRoute: Next()

    EmployeesRoute->>EmployeesCtrl: Chama controller.getEmployees(req, res)

    Note over EmployeesCtrl: Validação Query
    EmployeesCtrl->>EmployeesCtrl: paramsSchema.parse(req.query) - date obrigatória
    alt Date ausente/inválida
        EmployeesCtrl-->>Client: 400 {error: "Failed to fetch employees"}
    end

    Note over EmployeesCtrl: Parse data
    EmployeesCtrl->>EmployeesCtrl: parseISO(date) -> startOfDay/endOfDay

    par Busca paralela
        EmployeesCtrl->>Prisma: user.findMany() **SEM where companyId!**
        Prisma->>DB: SELECT * FROM User **TODOS USUÁRIOS DO BANCO**
        DB-->>Prisma: User[] (TODAS EMPRESAS!)
        Prisma-->>EmployeesCtrl: employees
    and
        EmployeesCtrl->>Prisma: checkIn.findMany({where: {createdAt: {gte: inicio, lte: fim}}})
        Prisma->>DB: SELECT * FROM CheckIn WHERE createdAt BETWEEN ? AND ? **companyId no contexto!**
        DB-->>Prisma: CheckIn[] (apenas da empresa logada)
        Prisma-->>EmployeesCtrl: checkins
    end

    Note over EmployeesCtrl: Merge em memória (PROBLEMA!)
    EmployeesCtrl->>EmployeesCtrl: employees.map(emp => { checkins.filter(c => c.userId === emp.id) })
    Note right of EmployeesCtrl: ⚠️ Vaza dados de outras empresas!

    EmployeesCtrl->>EmployeesCtrl: Remove password de cada employee
    EmployeesCtrl-->>Client: 200 [{employee, checkins: [...]}, ...]
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Autenticação Obrigatória** | JWT válido | `authMiddleware` |
| **Data Obrigatória** | Query param `date` string obrigatória | `z.object({date: z.string()})` |
| **Busca Funcionários** | `prisma.user.findMany()` **SEM FILTRO** | `prisma.user.findMany()` |
| **Busca Check-ins** | Com filtro de data **COM companyId do contexto** | `prisma.checkIn.findMany({where: {createdAt: {gte, lte}}})` |
| **Merge em Memória** | Loop manual para associar check-ins aos funcionários | `employees.map(emp => checkins.filter(c => c.userId === emp.id))` |
| **Remove Password** | Exclui campo password do response | `const {password, ...employeeWithoutPassword} = employee` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter** - 100 req/min
4. **AuthMiddleware** - JWT + contexto multi-tenancy
5. **Controller** - EmployeesController.getEmployees

## ⚠️ PROBLEMAS CRÍTICOS DE SEGURANÇA

| Problema | Severidade | Impacto |
|----------|------------|---------|
| **Vazamento Cross-Tenant** | 🔴 CRÍTICO | `user.findMany()` sem `where: {companyId}` retorna **TODOS usuários de TODAS empresas** |
| **Merge Inseguro** | 🔴 CRÍTICO | Check-ins filtrados por companyId (contexto), mas funcionários não - associação incorreta |
| **Sem Rate Limit Específico** | 🟡 MÉDIO | Apenas `generalApiLimiter` |
| **Sem Paginação** | 🟡 MÉDIO | Retorna todos funcionários de todas empresas |
| **Sem Verificação de Role** | 🟡 MÉDIO | Qualquer role (EMPLOYEE) pode listar todos |

## Análise do Bug Multi-Tenancy

```typescript
// PROBLEMA: user.findMany() ignora o contexto multi-tenancy
const employees = await prisma.user.findMany()  // SEM where companyId

// CONTEXTO FUNCIONA PARA CHECK-INS (Prisma Extension injeta companyId)
const checkins = await prisma.checkIn.findMany({
    where: { createdAt: { gte: inicio, lte: fim } }  // companyId injetado automaticamente
})

// RESULTADO: Funcionários de TODAS empresas + Check-ins apenas da empresa logada
// Merge resulta em: funcionários sem check-ins (ou check-ins de outros usuários com mesmo ID)
```

## Correção Necessária

```typescript
// CORRETO: Filtrar por companyId do usuário logado
const companyId = req.user.companyId
const employees = await prisma.user.findMany({
    where: { companyId }  // ESSENCIAL
})
```
# Fluxo: Convite Público - GET /companies/invites/:token e POST /companies/invites/accept

## Diagrama de Sequência - VALIDAR TOKEN (GET /companies/invites/:token)

```mermaid
sequenceDiagram
    autonumber
    actor Client (Funcionário)
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant Metrics as MetricsMiddleware
    participant CompanyRoute as Company Routes (PÚBLICO)
    participant CompanyCtrl as CompanyController.getInviteByToken
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: GET /companies/invites/:token
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min
    RateLimit-->>Express: OK
    Express->>Metrics: Coleta métricas
    Metrics-->>Express: Next
    Express->>CompanyRoute: Roteamento (FORA do authMiddleware!)

    Note over CompanyRoute: Rota PÚBLICA - sem authMiddleware, planMiddleware, RoleGuard

    CompanyRoute->>CompanyCtrl: Chama controller.getInviteByToken(req, res)

    Note over CompanyCtrl: Valida token param
    CompanyCtrl->>CompanyCtrl: paramsSchema.parse(req.params) - token: z.string()
    alt Inválido
        CompanyCtrl-->>Client: 400
    end

    Note over CompanyCtrl: Busca convite + empresa
    CompanyCtrl->>Prisma: inviteToken.findUnique({where: {token}, include: {company: {select: {id, name, plan, settings}}}})
    Prisma->>DB: SELECT i.*, c.id, c.name, c.plan, c.settings FROM InviteToken i JOIN Company c ON i.companyId = c.id WHERE i.token = ?
    DB-->>Prisma: InviteToken + Company
    alt Não encontrado
        CompanyCtrl-->>Client: 404 {message: "Convite não encontrado"}
    end

    Note over CompanyCtrl: Verifica se já usado
    CompanyCtrl->>CompanyCtrl: if (invite.usedAt) return 400
    alt Já usado
        CompanyCtrl-->>Client: 400 {message: "Convite já foi usado"}
    end

    Note over CompanyCtrl: Verifica expiração
    CompanyCtrl->>CompanyCtrl: if (invite.expiresAt < now) return 400
    alt Expirado
        CompanyCtrl-->>Client: 400 {message: "Convite expirado"}
    end

    CompanyCtrl-->>Client: 200 {email, role, company: {id, name, plan, settings}, expiresAt}
```

## Diagrama de Sequência - ACEITAR CONVITE (POST /companies/invites/accept)

```mermaid
sequenceDiagram
    autonumber
    actor Client (Funcionário)
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant Metrics as MetricsMiddleware
    participant CompanyRoute as Company Routes (PÚBLICO)
    participant CompanyCtrl as CompanyController.acceptInvite
    participant Prisma as Prisma Client
    participant DB as PostgreSQL
    participant Bcrypt as bcrypt
    participant JWT as jsonwebtoken

    Client->>Express: POST /companies/invites/accept {token, name, password, confirmPassword}
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min
    RateLimit-->>Express: OK
    Express->>Metrics: Coleta métricas
    Metrics-->>Express: Next
    Express->>CompanyRoute: Roteamento (PÚBLICO)

    CompanyRoute->>CompanyCtrl: Chama controller.acceptInvite(req, res)

    Note over CompanyCtrl: Validação Zod
    CompanyCtrl->>CompanyCtrl: bodySchema.parse(req.body) - token, name(3+), password(8+), confirmPassword
    alt Inválido
        CompanyCtrl-->>Client: 400
    end

    Note over CompanyCtrl: Senhas conferem
    CompanyCtrl->>CompanyCtrl: password === confirmPassword
    alt Diferentes
        CompanyCtrl-->>Client: 400 {message: "Senhas não conferem"}
    end

    Note over CompanyCtrl: Busca convite + empresa
    CompanyCtrl->>Prisma: inviteToken.findUnique({where: {token}, include: {company: true}})
    Prisma->>DB: SELECT i.*, c.* FROM InviteToken i JOIN Company c ON i.companyId = c.id WHERE i.token = ?
    DB-->>Prisma: InviteToken + Company
    alt Não encontrado
        CompanyCtrl-->>Client: 404 {message: "Convite inválido"}
    end

    Note over CompanyCtrl: Verificações de validade
    CompanyCtrl->>CompanyCtrl: if (invite.usedAt) return 400 "Convite já foi usado"
    CompanyCtrl->>CompanyCtrl: if (invite.expiresAt < now) return 400 "Convite expirado"

    Note over CompanyCtrl: Verifica usuário não existe
    CompanyCtrl->>Prisma: user.findUnique({where: {email: invite.email}})
    alt Email já cadastrado
        CompanyCtrl-->>Client: 400 {message: "Usuário já cadastrado"}
    end

    Note over CompanyCtrl: Hash senha
    CompanyCtrl->>Bcrypt: hash(password, 10)
    Bcrypt-->>CompanyCtrl: passwordHash

    Note over CompanyCtrl: Cria usuário
    CompanyCtrl->>Prisma: user.create({name, email: invite.email, passwordHash, role: invite.role, companyId: invite.companyId})
    Prisma->>DB: INSERT INTO User (name, email, password, role, companyId)
    DB-->>Prisma: User
    Prisma-->>CompanyCtrl: User

    Note over CompanyCtrl: Marca convite como usado
    CompanyCtrl->>Prisma: inviteToken.update({where: {id: invite.id}, data: {usedAt: now()}})
    Prisma->>DB: UPDATE InviteToken SET usedAt = now() WHERE id = ?
    DB-->>Prisma: OK

    Note over CompanyCtrl: Gera JWT completo
    CompanyCtrl->>JWT: sign({id: user.id, role: user.role, companyId, planTier: company.plan, isMaster: false}, JWT_SECRET, {expiresIn: '7d'})
    JWT-->>CompanyCtrl: token

    CompanyCtrl-->>Client: 200 {user: {id, name, email, role, companyId}, company: {id, name, plan}, token}
```

## Regras de Negócio (Validar Token)

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Rota Pública** | Sem autenticação, sem planMiddleware, sem RoleGuard | Rota registrada ANTES de `companyRoutes.use(authMiddleware)` |
| **Busca com Include** | Busca convite + dados da empresa (name, plan, settings) | `include: {company: {select: {id, name, plan, settings}}}` |
| **Validações** | Existe, não usado, não expirado | `if (invite.usedAt) / if (invite.expiresAt < now)` |
| **Retorno** | Email, role, empresa (para UI mostrar info), expiresAt | `{email, role, company, expiresAt}` |

## Regras de Negócio (Aceitar Convite)

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Rota Pública** | Sem autenticação | Fora do `use(authMiddleware)` |
| **Validação Completa** | Token, name(3+), password(8+), confirmPassword | `z.object({token: z.string(), name: z.string().min(3), password: z.string().min(8), confirmPassword: z.string()})` |
| **Senhas Conferem** | password === confirmPassword | `if (password !== confirmPassword)` |
| **Convite Válido** | Existe, não usado, não expirado | Mesmas verificações do GET |
| **Usuário Não Existe** | Email do convite não pode já ter conta | `user.findUnique({where: {email: invite.email}})` |
| **Cria Usuário** | Role = invite.role (ENTERPRISE_ADMIN ou EMPLOYEE) | `role: invite.role` |
| **Marca Usado** | `usedAt = now()` impede reuso | `inviteToken.update({data: {usedAt: new Date()}})` |
| **JWT Completo** | Inclui companyId, planTier, isMaster | `jwt.sign({id, role, companyId, planTier: company.plan, isMaster: false})` |
| **Login Automático** | Retorna token para login imediato | `return res.json({user, company, token})` |

## Middlewares Aplicados

**NENHUM** (Rotas Públicas)
- Registradas ANTES de `companyRoutes.use(authMiddleware)`
- Apenas: CORS, LoggingMiddleware, GeneralApiLimiter, MetricsMiddleware (do app.ts)

## Observações Importantes

✅ **Rotas Públicas Essenciais**: Permitem fluxo de aceite sem login prévio.

✅ **Validações Rigorosas**: Token válido, não usado, não expirado, email único.

✅ **Login Automático**: Retorna JWT para redirecionar direto ao dashboard.

✅ **Marca Usado Atomicamente**: `usedAt` impede reuso do mesmo token.

⚠️ **Sem Rate Limit Específico**: Vulnerável a brute force de tokens.

⚠️ **Senha Mínimo 8 chars**: Mais forte que login legacy.

##
